import { google } from 'googleapis';
import stream from 'stream';
import dotenv from 'dotenv';

dotenv.config();
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'];

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const drive = google.drive({ version: 'v3', auth: oauth2Client });

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || null;

function parseByteRange(rangeHeader, totalSize) {
  if (!rangeHeader || !Number.isFinite(totalSize) || totalSize <= 0) return null;

  const match = /^bytes=(\d*)-(\d*)$/i.exec(String(rangeHeader).trim());
  if (!match) {
    const error = new Error(`Unsupported byte range: ${rangeHeader}`);
    error.code = 'RANGE_NOT_SATISFIABLE';
    error.totalSize = totalSize;
    throw error;
  }

  const [, startValue, endValue] = match;
  let start;
  let end;

  if (startValue === '') {
    const suffixLength = Number(endValue);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      const error = new Error(`Invalid byte range: ${rangeHeader}`);
      error.code = 'RANGE_NOT_SATISFIABLE';
      error.totalSize = totalSize;
      throw error;
    }
    start = Math.max(totalSize - suffixLength, 0);
    end = totalSize - 1;
  } else {
    start = Number(startValue);
    end = endValue === '' ? totalSize - 1 : Number(endValue);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= totalSize || start > end) {
      const error = new Error(`Invalid byte range: ${rangeHeader}`);
      error.code = 'RANGE_NOT_SATISFIABLE';
      error.totalSize = totalSize;
      throw error;
    }
    end = Math.min(end, totalSize - 1);
  }

  return {
    start,
    end,
    length: end - start + 1,
    header: `bytes=${start}-${end}`,
    contentRange: `bytes ${start}-${end}/${totalSize}`,
  };
}

export async function uploadFileToDrive(fileBuffer, mimeType, originalName) {
  const bufferStream = new stream.PassThrough();
  bufferStream.end(fileBuffer);

  const fileMetadata = {
    name: originalName,
    parents: FOLDER_ID ? [FOLDER_ID] : [],
  };

  const media = {
    mimeType: mimeType,
    body: bufferStream,
  };

  try {
    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });

    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return {
      id: file.data.id,
      webViewLink: file.data.webViewLink,
      webContentLink: file.data.webContentLink,
    };
  } catch (err) {
    console.error('Error uploading file to Google Drive:', err);
    throw err;
  }
}

export async function getFileStream(fileId, rangeHeader = '') {
  try {
    // First, verify the file exists and get metadata
    const metadata = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, size'
    });

    console.log(`Fetching stream for file: ${metadata.data.name} (${metadata.data.mimeType})`);

    const totalSize = Number(metadata.data.size);
    const byteRange = parseByteRange(rangeHeader, totalSize);
    const requestOptions = { responseType: 'stream' };
    if (byteRange) requestOptions.headers = { Range: byteRange.header };

    // The Drive API supports byte ranges. Passing the browser's range through is
    // important because media elements request small chunks while buffering/seeking.
    try {
      const response = await drive.files.get(
        { fileId: fileId, alt: 'media' },
        requestOptions
      );
      const responseContentRange = response.headers['content-range'];
      const isPartial = response.status === 206 || Boolean(responseContentRange);

      return {
        stream: response.data,
        mimeType: metadata.data.mimeType || response.headers['content-type'],
        size: totalSize || Number(response.headers['content-length']),
        contentLength: Number(response.headers['content-length']) || (byteRange?.length || totalSize),
        statusCode: isPartial ? 206 : 200,
        contentRange: responseContentRange || (isPartial ? byteRange?.contentRange : null),
      };
    } catch (streamErr) {
      console.warn('API stream failed, trying direct fetch fallback:', streamErr.message);

      // Fallback: Use the authorized client to fetch the direct download URL
      // This is sometimes more stable for large files in serverless environments
      const accessToken = await oauth2Client.getAccessToken();
      const directUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

      const fetchHeaders = {
        'Authorization': `Bearer ${accessToken.token}`
      };
      if (byteRange) fetchHeaders.Range = byteRange.header;

      const fetchResponse = await fetch(directUrl, { headers: fetchHeaders });

      if (fetchResponse.status === 416) {
        const error = new Error('Direct fetch returned an unsatisfiable byte range');
        error.code = 'RANGE_NOT_SATISFIABLE';
        error.totalSize = totalSize;
        throw error;
      }
      if (!fetchResponse.ok) {
        throw new Error(`Direct fetch failed with status ${fetchResponse.status}`);
      }

      const responseContentRange = fetchResponse.headers.get('content-range');
      const isPartial = fetchResponse.status === 206 || Boolean(responseContentRange);
      const responseBody = fetchResponse.body && typeof stream.Readable?.fromWeb === 'function'
        ? stream.Readable.fromWeb(fetchResponse.body)
        : fetchResponse.body;

      return {
        stream: responseBody,
        mimeType: metadata.data.mimeType || fetchResponse.headers.get('content-type'),
        size: totalSize || Number(fetchResponse.headers.get('content-length')),
        contentLength: Number(fetchResponse.headers.get('content-length')) || (byteRange?.length || totalSize),
        statusCode: isPartial ? 206 : 200,
        contentRange: responseContentRange || (isPartial ? byteRange?.contentRange : null),
      };
    }
  } catch (err) {
    console.error('Error fetching file from Google Drive:', err.message);
    throw err;
  }
}
