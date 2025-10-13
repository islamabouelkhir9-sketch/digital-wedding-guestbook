'use client';

import { useState, useRef, useEffect } from 'react';
import { X, MessageSquare, Mic, Image as ImageIcon, Video, Upload, Loader2, CheckCircle, StopCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

interface SubmissionModalProps {
  eventId: string;
  accentColor: string;
  onClose: () => void;
  onSuccess: () => void;
}

type MessageType = 'text' | 'voice' | 'photo' | 'video';

export default function SubmissionModal({ eventId, accentColor, onClose, onSuccess }: SubmissionModalProps) {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [senderName, setSenderName] = useState('');
  const [senderContact, setSenderContact] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('text');
  const [textContent, setTextContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' });
        setFile(audioFile);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      setError('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file size
    const maxSize = messageType === 'video' ? 200 * 1024 * 1024 : 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError(`File size exceeds ${messageType === 'video' ? '200MB' : '10MB'} limit`);
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!senderName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (messageType === 'text' && !textContent.trim()) {
      setError('Please enter a message');
      return;
    }

    if (messageType !== 'text' && !file) {
      setError('Please record or upload a file');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let storagePath = null;
      let storageMeta = {};

      // Upload file if exists
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${eventId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('guestbook-media')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        storagePath = uploadData.path;
        storageMeta = {
          size: file.size,
          type: file.type,
          name: file.name
        };
      }

      // Create submission record
      const { error: insertError } = await supabase
        .from('submissions')
        .insert({
          event_id: eventId,
          sender_name: senderName.trim(),
          sender_contact: senderContact.trim() || null,
          type: messageType,
          content: messageType === 'text' ? textContent.trim() : null,
          storage_path: storagePath,
          storage_meta: storageMeta,
          moderated: false
        });

      if (insertError) throw insertError;

      setStep('success');
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {step === 'form' ? (
            <form onSubmit={handleSubmit}>
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">Leave a Message</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <div className="p-6 space-y-6">
                {/* Sender Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>

                {/* Sender Contact (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email or Phone (Optional)
                  </label>
                  <input
                    type="text"
                    value={senderContact}
                    onChange={(e) => setSenderContact(e.target.value)}
                    placeholder="your@email.com or phone number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                {/* Message Type Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Message Type
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { type: 'text' as MessageType, icon: MessageSquare, label: 'Text' },
                      { type: 'voice' as MessageType, icon: Mic, label: 'Voice' },
                      { type: 'photo' as MessageType, icon: ImageIcon, label: 'Photo' },
                      { type: 'video' as MessageType, icon: Video, label: 'Video' }
                    ].map(({ type, icon: Icon, label }) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setMessageType(type);
                          setFile(null);
                          setFilePreview(null);
                          setTextContent('');
                        }}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          messageType === type
                            ? `border-${accentColor === 'gold' ? 'yellow' : 'pink'}-500 bg-${accentColor === 'gold' ? 'yellow' : 'pink'}-50`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className={`w-6 h-6 mx-auto mb-2 ${
                          messageType === type 
                            ? `text-${accentColor === 'gold' ? 'yellow' : 'pink'}-600` 
                            : 'text-gray-400'
                        }`} />
                        <span className={`text-sm font-medium ${
                          messageType === type ? 'text-gray-900' : 'text-gray-600'
                        }`}>
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Content */}
                <div>
                  {messageType === 'text' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Message <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        placeholder="Write your congratulatory message here..."
                        rows={6}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all resize-none"
                        required
                      />
                    </div>
                  )}

                  {messageType === 'voice' && (
                    <div className="space-y-4">
                      {!file ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                          {!isRecording ? (
                            <button
                              type="button"
                              onClick={startRecording}
                              className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${
                                accentColor === 'gold' 
                                  ? 'from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600' 
                                  : 'from-pink-400 to-pink-500 hover:from-pink-500 hover:to-pink-600'
                              } text-white rounded-full font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all`}
                            >
                              <Mic className="w-5 h-5" />
                              Start Recording
                            </button>
                          ) : (
                            <div className="space-y-4">
                              <div className="flex items-center justify-center gap-3">
                                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                <span className="text-2xl font-mono font-bold text-gray-900">
                                  {formatTime(recordingTime)}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={stopRecording}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold shadow-lg transition-colors"
                              >
                                <StopCircle className="w-5 h-5" />
                                Stop Recording
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-3">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                              <span className="text-sm font-medium text-green-900">
                                Voice message recorded ({formatTime(recordingTime)})
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setFile(null);
                                setRecordingTime(0);
                              }}
                              className="text-sm text-red-600 hover:text-red-700 font-medium"
                            >
                              Re-record
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {(messageType === 'photo' || messageType === 'video') && (
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={messageType === 'photo' ? 'image/*' : 'video/*'}
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      {!file ? (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors"
                        >
                          <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                          <p className="text-gray-600 font-medium">
                            Click to upload {messageType}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Max size: {messageType === 'video' ? '200MB' : '10MB'}
                          </p>
                        </button>
                      ) : (
                        <div className="space-y-3">
                          {filePreview && (
                            <div className="relative rounded-lg overflow-hidden">
                              {messageType === 'photo' ? (
                                <img src={filePreview} alt="Preview" className="w-full" />
                              ) : (
                                <video src={filePreview} controls className="w-full" />
                              )}
                            </div>
                          )}
                          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-3">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                              <span className="text-sm font-medium text-green-900">
                                {file.name}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setFile(null);
                                setFilePreview(null);
                              }}
                              className="text-sm text-red-600 hover:text-red-700 font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${
                    accentColor === 'gold' 
                      ? 'from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600' 
                      : 'from-pink-400 to-pink-500 hover:from-pink-500 hover:to-pink-600'
                  } text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Message'
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-12 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.5 }}
              >
                <CheckCircle className="w-20 h-20 mx-auto mb-6 text-green-500" />
              </motion.div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Thank You!
              </h3>
              <p className="text-gray-600">
                Your message has been submitted successfully.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

