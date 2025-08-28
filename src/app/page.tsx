import FolderUpload from '../components/FolderUpload';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Tool Upload Folder & Chuyển đổi Ảnh sang WebP
          </h1>
          <p className="text-gray-600">
            Upload folder và tự động chuyển đổi tất cả ảnh sang định dạng WebP với chất lượng cao
          </p>
        </div>
        <FolderUpload />
      </div>
    </div>
  );
}
