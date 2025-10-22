import { Upload, X, FileText } from 'lucide-react';
import type { RequestFormData } from '../CreateRequestWizard';

interface Step3Props {
  data: RequestFormData;
  updateData: (data: Partial<RequestFormData>) => void;
}

export default function Step3Attachments({ data, updateData }: Step3Props) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    updateData({ attachments: [...data.attachments, ...files] });
  };

  const removeFile = (index: number) => {
    const newAttachments = data.attachments.filter((_, i) => i !== index);
    updateData({ attachments: newAttachments });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Adjuntos</h2>
        <p className="text-sm text-gray-600">
          Sube briefs, mockups, referencias o cualquier otro documento relevante
        </p>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition">
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-base font-medium text-gray-900 mb-1">
            Haz clic para subir o arrastra y suelta
          </p>
          <p className="text-sm text-gray-500">
            PDF, DOC, XLS, PPT o imágenes (máx. 10MB por archivo)
          </p>
        </label>
      </div>

      {data.attachments.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Archivos Subidos ({data.attachments.length})
          </p>
          {data.attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="text-red-600 hover:text-red-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
