import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  Box,
  Grid,
  Alert,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import {
  Mic,
  MicOff,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { API_CONFIG, chatAPI, customerAPI, fileAPI, suspiciousAPI, healthCheck } from '../config/api-final';

// Type declarations for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface ClientData {
  name: string;
  mobile: string;
  totalDue: number;
  emiAmount: number;
  dueDate: string;
}

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: Date;
}

const AiReminder: React.FC = () => {
  const [clientData, setClientData] = useState<ClientData>({
    name: '',
    mobile: '',
    totalDue: 0,
    emiAmount: 0,
    dueDate: '',
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [audioInterfaceVisible, setAudioInterfaceVisible] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [speechTimeout, setSpeechTimeout] = useState<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeSpeechRecognition();
    return () => {
      if (recognition) {
        recognition.stop();
      }
      if (speechTimeout) {
        clearTimeout(speechTimeout);
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();

      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';
      recognitionInstance.maxAlternatives = 1;

      recognitionInstance.onstart = () => {
        setStatus('listening');
        setIsListening(true);
        setCurrentTranscript('');
      };

      recognitionInstance.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setCurrentTranscript(prev => prev + finalTranscript);
          processUserSpeech(finalTranscript);
        }

        if (interimTranscript) {
          setStatus(`listening: "${interimTranscript}"`);
        }
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
        setStatus('idle');
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
        if (!isProcessing) {
          setStatus('idle');
        }
      };

      setRecognition(recognitionInstance);
    } else {
      setError('Speech recognition not supported in this browser');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await customerAPI.create(clientData);
      if (response.success) {
        setSuccess('Client data saved successfully');
        setAudioInterfaceVisible(true);
        startAIConversation();
      }
    } catch (error) {
      console.error('Error saving client data:', error);
      setError('Failed to save client data');
      setAudioInterfaceVisible(true);
      startAIConversation();
    }
  };

  const startAIConversation = () => {
    const greeting = generateGreeting();
    addMessage('ai', greeting);
    speakText(greeting);
  };

  const generateGreeting = () => {
    const dueDate = new Date(clientData.dueDate);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let greeting = `Hello ${clientData.name}, this is an automated reminder from your loan service provider. `;

    if (daysUntilDue > 0) {
      greeting += `Your EMI of ₹${clientData.emiAmount} is due in ${daysUntilDue} days on ${dueDate.toLocaleDateString()}. `;
    } else if (daysUntilDue === 0) {
      greeting += `Your EMI of ₹${clientData.emiAmount} is due today. `;
    } else {
      greeting += `Your EMI of ₹${clientData.emiAmount} was due ${Math.abs(daysUntilDue)} days ago. `;
    }

    greeting += `Your current outstanding amount is ₹${clientData.totalDue}. How can I assist you today?`;

    return greeting;
  };

  const processUserSpeech = async (transcript: string) => {
    if (isProcessing) return;

    setIsProcessing(true);
    setStatus('processing');

    addMessage('user', transcript);
    setCurrentTranscript('');

    try {
      const response = await chatAPI.sendMessage({
        message: transcript,
        clientData: clientData,
        sessionId: generateSessionId(),
      });

      if (response.success) {
        const aiResponse = response.response;
        addMessage('ai', aiResponse);

        // Play audio if available
        if (response.audioUrl) {
          if (audioRef.current) {
            audioRef.current.src = response.audioUrl;
            audioRef.current.play();
          }
        } else {
          speakText(aiResponse);
        }
      }
    } catch (error) {
      console.error('API error:', error);
      const fallbackResponse = generateFallbackResponse(transcript);
      addMessage('ai', fallbackResponse);
      speakText(fallbackResponse);
    }

    setTimeout(() => {
      setIsProcessing(false);
      if (isListening) {
        setStatus('listening');
      } else {
        setStatus('idle');
      }
    }, 1000);
  };

  const generateFallbackResponse = (input: string) => {
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes('paid') || lowerInput.includes('payment')) {
      return `Thank you for confirming your payment, ${clientData.name}. Please ensure the payment is processed before the due date.`;
    }

    if (lowerInput.includes('balance') || lowerInput.includes('outstanding')) {
      return `Your current outstanding loan amount is ₹${clientData.totalDue}. Your next EMI is due on ${new Date(clientData.dueDate).toLocaleDateString()}.`;
    }

    if (lowerInput.includes('emi') || lowerInput.includes('installment')) {
      return `Your monthly EMI amount is ₹${clientData.emiAmount}. The due date is ${new Date(clientData.dueDate).toLocaleDateString()}.`;
    }

    return `I understand your concern, ${clientData.name}. For detailed assistance, please contact our customer service.`;
  };

  const speakText = async (text: string) => {
    try {
      // Use browser TTS as fallback since Polly endpoint might not be available
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice =>
        voice.name.includes('Joanna') ||
        voice.name.includes('Female')
      );

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('TTS error:', error);
    }
  };

  const addMessage = (sender: 'ai' | 'user', text: string) => {
    const message: Message = {
      id: Date.now().toString(),
      sender,
      text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, message]);
  };

  const generateSessionId = () => {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  const startListening = () => {
    if (recognition && !isListening) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          recognition.start();
        })
        .catch(error => {
          setError('Microphone access denied');
        });
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
    }
  };

  const testMicrophone = () => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        setSuccess('Microphone access granted');
      })
      .catch(() => {
        setError('Microphone access denied');
      });
  };

  const getStatusColor = () => {
    switch (status.split(':')[0]) {
      case 'listening': return 'success';
      case 'processing': return 'warning';
      case 'speaking': return 'info';
      default: return 'default';
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          AI Reminder (Connected to AWS)
        </Typography>

        {!audioInterfaceVisible ? (
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Client Information
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Enter client details for EMI reminder call
            </Typography>

            <Box component="form" onSubmit={handleFormSubmit} sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Client Name"
                    value={clientData.name}
                    onChange={(e) => setClientData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Mobile Number"
                    type="tel"
                    value={clientData.mobile}
                    onChange={(e) => setClientData(prev => ({ ...prev, mobile: e.target.value }))}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Total Due Amount (₹)"
                    type="number"
                    value={clientData.totalDue}
                    onChange={(e) => setClientData(prev => ({ ...prev, totalDue: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="EMI Amount (₹)"
                    type="number"
                    value={clientData.emiAmount}
                    onChange={(e) => setClientData(prev => ({ ...prev, emiAmount: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <DatePicker
                    label="Due Date"
                    value={clientData.dueDate ? new Date(clientData.dueDate) : null}
                    onChange={(date) => setClientData(prev => ({
                      ...prev,
                      dueDate: date ? date.toISOString().split('T')[0] : ''
                    }))}
                    slotProps={{ textField: { fullWidth: true, required: true } }}
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 3 }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  fullWidth
                >
                  Start AI Call
                </Button>
              </Box>
            </Box>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Chip
                      label={status}
                      color={getStatusColor()}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {new Date().toLocaleTimeString()}
                    </Typography>
                  </Box>

                  <Box display="flex" gap={1} mb={2}>
                    <Button
                      variant="contained"
                      color={isListening ? "error" : "success"}
                      startIcon={isListening ? <MicOff /> : <Mic />}
                      onClick={isListening ? stopListening : startListening}
                      disabled={isProcessing}
                    >
                      {isListening ? 'Stop Listening' : 'Start Listening'}
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Mic />}
                      onClick={testMicrophone}
                    >
                      Test Microphone
                    </Button>
                  </Box>

                  <Box
                    sx={{
                      maxHeight: 400,
                      overflowY: 'auto',
                      border: '1px solid #e0e0e0',
                      borderRadius: 1,
                      p: 2,
                      bgcolor: '#fafafa'
                    }}
                  >
                    {messages.map((message) => (
                      <Box
                        key={message.id}
                        sx={{
                          mb: 2,
                          p: 1,
                          borderRadius: 1,
                          bgcolor: message.sender === 'ai' ? '#e3f2fd' : '#f3e5f5',
                          border: `1px solid ${message.sender === 'ai' ? '#bbdefb' : '#ce93d8'}`,
                        }}
                      >
                        <Typography variant="body1">{message.text}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {message.timestamp.toLocaleTimeString()} - {message.sender.toUpperCase()}
                        </Typography>
                      </Box>
                    ))}
                    <div ref={messagesEndRef} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mt: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <audio ref={audioRef} />
      </Container>
    </LocalizationProvider>
  );
};

export default AiReminder;
