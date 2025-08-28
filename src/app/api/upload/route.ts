import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import archiver from 'archiver';

// Interface cho kết quả chuyển đổi
interface ConversionResult {
  originalName: string;
  convertedBuffer: Buffer;
  folder: string;
  fileName: string;
  mimeType: string;
}

// Hàm kiểm tra xem file có phải là ảnh không
function isImageFile(filename: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'];
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return imageExtensions.includes(ext);
}

// Hàm chuyển đổi ảnh sang WebP
async function convertImageToWebp(buffer: Buffer): Promise<Buffer> {
  try {
    const result = await sharp(buffer)
      .toFormat('webp')
      .webp({ quality: 100 })
      .toBuffer();
    return result;
  } catch (error) {
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Không có file nào được gửi' },
        { status: 400 }
      );
    }

    const uploadedFiles: string[] = [];
    const convertedImages: ConversionResult[] = [];
    const processingErrors: string[] = [];

    // Xử lý files
    for (const file of files) {
      if (file instanceof File) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Tách đường dẫn và tên file
        const pathParts = file.name.split('/');
        const fileName = pathParts.pop() || file.name;
        const folderPath = pathParts.join('/');

        // Lưu thông tin file đã upload
        const relativePath = folderPath ? `${folderPath}/${fileName}` : fileName;
        uploadedFiles.push(relativePath);

        // Chuyển đổi ảnh nếu là file ảnh
        if (isImageFile(fileName)) {
          try {
            const convertedBuffer = await convertImageToWebp(buffer);
            const convertedFileName = `${fileName.substring(0, fileName.lastIndexOf('.'))}.webp`;

            convertedImages.push({
              originalName: fileName,
              convertedBuffer: convertedBuffer,
              folder: folderPath,
              fileName: convertedFileName,
              mimeType: 'image/webp'
            });

            console.log(`Chuyển đổi thành công: ${fileName} -> ${convertedFileName}`);
          } catch (err) {
            const errorMsg = `Lỗi khi chuyển đổi ${fileName}: ${err}`;
            processingErrors.push(errorMsg);
            console.error(errorMsg);
          }
        }
      }
    }

    // Sắp xếp kết quả theo thứ tự thư mục
    const sortedConvertedImages = convertedImages.sort((a, b) => {
      // Sắp xếp theo folder trước, sau đó theo tên file
      if (a.folder !== b.folder) {
        return a.folder.localeCompare(b.folder);
      }
      return a.fileName.localeCompare(b.fileName);
    });

    // Nhóm kết quả theo folder
    const groupedResults = sortedConvertedImages.reduce((groups, item) => {
      if (!groups[item.folder]) {
        groups[item.folder] = [];
      }
      groups[item.folder].push(item);
      return groups;
    }, {} as Record<string, ConversionResult[]>);

    // Tạo response với file data
    const responseData: {
      message: string;
      files: string[];
      count: number;
      convertedImages: Array<{
        originalName: string;
        fileName: string;
        folder: string;
        mimeType: string;
        size: number;
      }>;
      convertedCount: number;
      groupedResults: Record<string, Array<{
        originalName: string;
        fileName: string;
        folder: string;
        mimeType: string;
        size: number;
      }>>;
      errors: string[];
      zipData?: string;
    } = {
      message: 'Upload thành công',
      files: uploadedFiles,
      count: uploadedFiles.length,
      convertedImages: sortedConvertedImages.map(img => ({
        originalName: img.originalName,
        fileName: img.fileName,
        folder: img.folder,
        mimeType: img.mimeType,
        size: img.convertedBuffer.length
      })),
      convertedCount: convertedImages.length,
      groupedResults: Object.keys(groupedResults).reduce((acc, folder) => {
        acc[folder] = groupedResults[folder].map(img => ({
          originalName: img.originalName,
          fileName: img.fileName,
          folder: img.folder,
          mimeType: img.mimeType,
          size: img.convertedBuffer.length
        }));
        return acc;
      }, {} as Record<string, Array<{
        originalName: string;
        fileName: string;
        folder: string;
        mimeType: string;
        size: number;
      }>>),
      errors: processingErrors
    };

    // Nếu có ảnh đã chuyển đổi, thêm vào response
    if (convertedImages.length > 0) {
      // Tạo ZIP buffer chứa tất cả ảnh đã chuyển đổi
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      archive.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      archive.on('end', () => {
        const zipBuffer = Buffer.concat(chunks);
        responseData.zipData = zipBuffer.toString('base64');
      });

      // Thêm từng ảnh vào ZIP
      for (const img of sortedConvertedImages) {
        const filePath = img.folder ? `${img.folder}/${img.fileName}` : img.fileName;
        archive.append(img.convertedBuffer, { name: filePath });
      }

      await archive.finalize();
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi upload file' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'API upload folder với xử lý ảnh - tự động chuyển đổi sang WebP' });
}
