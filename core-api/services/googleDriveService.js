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

export async function getFileStream(fileId) {
  try {
    // First, verify the file exists and get metadata
    const metadata = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, size'
    });

    console.log(`Fetching stream for file: ${metadata.data.name} (${metadata.data.mimeType})`);

    // For larger files, Google might require a confirmation token if accessed via browser,
    // but the API usually handles it. However, if the API fails, we try a direct fetch.
    try {
      const response = await drive.files.get(
        { fileId: fileId, alt: 'media' },
        { responseType: 'stream' }
      );

      return {
        stream: response.data,
        mimeType: metadata.data.mimeType || response.headers['content-type'],
        size: metadata.data.size || response.headers['content-length']
      };
    } catch (streamErr) {
      console.warn('API stream failed, trying direct fetch fallback:', streamErr.message);

      // Fallback: Use the authorized client to fetch the direct download URL
      // This is sometimes more stable for large files in serverless environments
      const accessToken = await oauth2Client.getAccessToken();
      const directUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

      const fetchResponse = await fetch(directUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken.token}`
        }
      });

      if (!fetchResponse.ok) {
        throw new Error(`Direct fetch failed with status ${fetchResponse.status}`);
      }

      return {
        stream: fetchResponse.body,
        mimeType: metadata.data.mimeType || fetchResponse.headers.get('content-type'),
        size: metadata.data.size || fetchResponse.headers.get('content-length')
      };
    }
  } catch (err) {
    console.error('Error fetching file from Google Drive:', err.message);
    throw err;
  }
}
