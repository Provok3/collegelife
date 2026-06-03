'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Camera, Upload, X } from 'lucide-react'
import { upload } from '@vercel/blob/client'
import { createClient } from '@/lib/supabase/client'
import {
  MAX_PHOTO_SIZE_BYTES,
  MAX_PHOTO_SIZE_LABEL,
  PHOTO_MULTIPART_THRESHOLD_BYTES,
} from '@/lib/photos/constants'

export function PhotoUpload() {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.size > MAX_PHOTO_SIZE_BYTES) {
        setError(`Photo is too large. Maximum size is ${MAX_PHOTO_SIZE_LABEL}.`)
        setFile(null)
        setPreview(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        return
      }
      setError(null)
      setFile(selectedFile)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setProgress(0)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('You must be signed in to upload a photo.')
        return
      }

      // Upload straight from the browser to Vercel Blob, bypassing the
      // serverless request-body limit. /api/photos/upload only mints a token.
      const blob = await upload(`photos/${user.id}/${file.name}`, file, {
        access: 'private',
        handleUploadUrl: '/api/photos/upload',
        contentType: file.type || undefined,
        multipart: file.size > PHOTO_MULTIPART_THRESHOLD_BYTES,
        onUploadProgress: (event) => setProgress(event.percentage),
      })

      // Record the photo in the database now that the blob exists.
      const response = await fetch('/api/photos/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pathname: blob.pathname, caption }),
      })

      if (response.ok) {
        const { photo } = await response.json()
        setOpen(false)
        setFile(null)
        setPreview(null)
        setCaption('')
        // Land on the freshly uploaded photo: re-fetch the server data, then
        // deep-link to it so the gallery expands and scrolls into view.
        router.refresh()
        if (photo?.id) {
          router.push(`/dashboard/photos?photo=${photo.id}`)
        }
      }

      setOpen(false)
      setFile(null)
      setPreview(null)
      setCaption('')
      router.refresh()
    } catch (error) {
      console.error('Upload failed:', error)
      setError(
        error instanceof Error && /too large|maximum/i.test(error.message)
          ? `Photo is too large. Maximum size is ${MAX_PHOTO_SIZE_LABEL}.`
          : 'Upload failed. Please check your connection and try again.',
      )
    } finally {
      setIsUploading(false)
      setProgress(0)
    }
  }

  const clearSelection = () => {
    setFile(null)
    setPreview(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Camera className="w-4 h-4 mr-2" />
          Add Photo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Photo</DialogTitle>
          <DialogDescription>
            Share a photo with your family and friends
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!preview ? (
            <div 
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                Click to select a photo or drag and drop
              </p>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            <div className="relative">
              <img 
                src={preview} 
                alt="Preview" 
                className="w-full rounded-lg max-h-64 object-cover"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={clearSelection}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="caption">Caption (optional)</Label>
            <Input
              id="caption"
              placeholder="What's happening in this photo?"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {isUploading && (
            <div className="space-y-1">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground text-right">
                {Math.round(progress)}%
              </p>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="w-full"
          >
            {isUploading ? `Uploading… ${Math.round(progress)}%` : 'Upload Photo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
