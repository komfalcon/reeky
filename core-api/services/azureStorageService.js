import { BlobServiceClient } from '@azure/storage-blob';
import crypto from 'crypto';
import path from 'path';

// Ensure AZURE_STORAGE_CONNECTION_STRING is defined in your environment
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
const containerName = 'reeky-assets'; // We'll use a single container for all PDF uploads

let blobServiceClient;
if (connectionString) {
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
}

/**
 * Uploads a file buffer to Azure Blob Storage
 * @param {Buffer} fileBuffer - The file data
 * @param {string} mimeType - The file mimetype (e.g., 'application/pdf')
 * @param {string} originalName - The original filename
 * @returns {Promise<Object>} - An object containing id, webViewLink, and webContentLink
 */
export async function uploadFileToAzure(fileBuffer, mimeType, originalName) {
    if (!blobServiceClient) {
        throw new Error('Azure Storage is not configured. Missing AZURE_STORAGE_CONNECTION_STRING.');
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // Create container if it doesn't exist, set to public read access for blobs
    await containerClient.createIfNotExists({
        access: 'blob' 
    });

    // Generate a unique filename to prevent overwrites
    const ext = path.extname(originalName) || '.pdf';
    const uniqueId = crypto.randomUUID();
    const blobName = `${uniqueId}${ext}`;
    
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Upload the buffer
    await blockBlobClient.uploadData(fileBuffer, {
        blobHTTPHeaders: {
            blobContentType: mimeType,
            blobContentDisposition: `inline; filename="${originalName}"`
        }
    });

    // Azure Blob URLs are directly accessible if the container access is set to 'blob'
    const fileUrl = blockBlobClient.url;

    return {
        id: uniqueId,
        webViewLink: fileUrl,     // Used for embedding in iframes
        webContentLink: fileUrl   // Used for direct downloads/processing
    };
}
