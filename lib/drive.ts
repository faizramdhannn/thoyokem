import { google } from 'googleapis';
import { Readable } from 'stream';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

export async function getGoogleDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: SCOPES,
  });

  const drive = google.drive({ version: 'v3', auth });
  return drive;
}

export async function uploadToGoogleDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  try {
    console.log('=== GOOGLE DRIVE UPLOAD DEBUG ===');
    console.log('📧 Service Account:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
    
    const drive = await getGoogleDriveClient();
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    console.log('📁 Folder ID from ENV:', folderId);

    // CRITICAL CHECK
    if (!folderId || folderId.trim() === '') {
      throw new Error('❌ GOOGLE_DRIVE_FOLDER_ID is not set or empty in .env file');
    }

    console.log('📄 File Name:', fileName);
    console.log('📦 File Size:', fileBuffer.length, 'bytes');
    console.log('🎨 MIME Type:', mimeType);

    // First, verify we can access the folder
    console.log('🔍 Verifying folder access...');
    try {
      const folderCheck = await drive.files.get({
        fileId: folderId,
        fields: 'id, name, mimeType, capabilities',
      });
      
      console.log('✅ Folder found:', folderCheck.data.name);
      console.log('✅ Folder capabilities:', folderCheck.data.capabilities);
      
      if (!folderCheck.data.capabilities?.canAddChildren) {
        throw new Error('❌ Service account does not have permission to add files to this folder. Please share the folder with Editor permission.');
      }
    } catch (folderError: any) {
      console.error('❌ Cannot access folder:', folderError.message);
      if (folderError.code === 404) {
        throw new Error(`Folder not found. Please check: 1) Folder ID is correct, 2) Folder is shared with service account as Editor`);
      }
      throw new Error(`Cannot access folder: ${folderError.message}`);
    }

    const stream = Readable.from(fileBuffer);

    const fileMetadata = {
      name: fileName,
      parents: [folderId], // CRITICAL: Must specify parent
    };

    const media = {
      mimeType: mimeType,
      body: stream,
    };

    console.log('⬆️  Uploading file to Google Drive...');

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, webContentLink',
    });

    console.log('✅ Upload successful!');
    console.log('📁 File ID:', file.data.id);
    console.log('📄 File Name:', file.data.name);

    if (!file.data.id) {
      throw new Error('Failed to get file ID from upload response');
    }

    // Make the file publicly accessible
    console.log('🔓 Making file public...');
    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    const viewLink = file.data.webViewLink || `https://drive.google.com/file/d/${file.data.id}/view`;
    console.log('🔗 File link:', viewLink);
    console.log('=== UPLOAD COMPLETE ===\n');

    return viewLink;
  } catch (error: any) {
    console.error('❌ === UPLOAD ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    
    if (error.code === 403) {
      console.error('\n🔴 PERMISSION ERROR DETECTED');
      console.error('Possible causes:');
      console.error('1. Folder not shared with service account');
      console.error('2. Service account has Viewer permission instead of Editor');
      console.error('3. GOOGLE_DRIVE_FOLDER_ID is wrong');
      console.error('\nTo fix:');
      console.error('1. Open Google Drive folder');
      console.error('2. Right-click → Share');
      console.error('3. Add:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
      console.error('4. Set permission to: Editor');
      console.error('5. Uncheck "Notify people"');
      console.error('6. Click Share\n');
    }
    
    throw error;
  }
}

export async function deleteFromGoogleDrive(fileId: string): Promise<boolean> {
  try {
    const drive = await getGoogleDriveClient();
    await drive.files.delete({ fileId });
    return true;
  } catch (error) {
    console.error('Error deleting from Google Drive:', error);
    throw error;
  }
}