import { useState, useRef, ChangeEvent } from 'react'
import { Button } from '../ui/button'

interface FileSelectorProps {
  onFileSelected: (file: File) => void
}

function FileSelector({ onFileSelected }: FileSelectorProps) {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      const file = files[0]
      setSelectedFileName(file.name)
      onFileSelected(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFileName(file.name)
        onFileSelected(file)
      } else {
        alert('Please select a CSV file')
      }
    }
  }

  return (
    <div className="flex flex-col items-start gap-4 w-full">
      <div className="flex flex-col w-full gap-2">
        <label className="text-sm font-medium">Import Transactions from CSV</label>
        
        <div
          className={`file-drop-zone w-full ${isDragging ? 'border-blue-500 bg-blue-50' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleButtonClick}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="32" 
            height="32" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="mx-auto mb-2 text-gray-400"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" x2="12" y1="3" y2="15" />
          </svg>
          
          <p className="text-sm text-gray-600 mb-1">
            {selectedFileName ? selectedFileName : 'Drag & drop your CSV file here'}
          </p>
          <p className="text-xs text-gray-500">
            or click to browse files
          </p>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />
        </div>
      </div>
      
      {selectedFileName && (
        <div className="text-sm text-green-600 font-medium">
          File selected! Now you can proceed with mapping the columns.
        </div>
      )}
    </div>
  )
}

export default FileSelector 