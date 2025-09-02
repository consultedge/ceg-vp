import React, { useState, useEffect, useRef } from 'react';

const AiReminderUpdated: React.FC = () => {
  const [clientName, setClientName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [totalDue, setTotalDue] = useState('');
  const [emiAmount, setEmiAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [statusText, setStatusText] = useState('Ready to start');
  const [statusClass, setStatusClass] = useState('status-idle');
  const [conversationLog, setConversationLog] = useState<{ sender: string; message: string; time: string }[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef(window.speechSynthesis);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const currentTranscriptRef = useRef('');
  const speechTimeoutRef = useRef<number | null>(null);
  const clientDataRef = useRef<any>({});

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setErrorMessage('Your browser does not support speech recognition. Please use Chrome, Edge, or Safari.');
      return;
    }
    setupSpeechRecognition();
  }, []);

  const setupSpeechRecognition = () => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage('Speech recognition not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setStatusText('Listening...');
      setStatusClass('status-listening');
      setIsListening(true);
      currentTranscriptRef.current = '';
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        currentTranscriptRef.current += finalTranscript;
        if (!isProcessing) {
          processUserSpeech(currentTranscriptRef.current.trim());
          return;
        }
      }

      if (interimTranscript) {
        setStatusText(`Listening... "${interimTranscript}"`);
      }

      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }

      if (currentTranscriptRef.current.trim() && !isProcessing) {
        speechTimeoutRef.current = window.setTimeout(() => {
          if (currentTranscriptRef.current.trim() && !isProcessing) {
            processUserSpeech(currentTranscriptRef.current.trim());
          }
        }, 3000);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        setErrorMessage('Microphone access denied. Please allow microphone access and try again.');
        stopListening();
      } else if (event.error === 'no-speech') {
        // Ignore no-speech errors
      } else if (event.error === 'network') {
        setErrorMessage('Network error occurred. Please check your connection.');
      } else {
        setErrorMessage('Speech recognition error: ' + event.error);
      }
    };

    recognition.onend = () => {
      if (isListening && !isProcessing) {
        setTimeout(() => {
          if (isListening && !isProcessing) {
            try {
              recognition.start();
            } catch (error) {
              setStatusText('Recognition stopped');
              setStatusClass('status-idle');
              setIsListening(false);
            }
          }
        }, 100);
      } else {
        setStatusText('Stopped listening');
        setStatusClass('status-idle');
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      setErrorMessage('Speech recognition not supported.');
      return;
    }
    if (isListening) {
      stopListening();
      setTimeout(startListening, 500);
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(() => {
      setIsListening(true);
      setIsProcessing(false);
      currentTranscriptRef.current = '';
      recognitionRef.current!.start();
    }).catch(() => {
      setErrorMessage('Microphone access is required for voice interaction.');
    });
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setIsProcessing(false);
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
    setStatusText('Stopped');
    setStatusClass('status-idle');
  };

  const processUserSpeech = (transcript: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setStatusText('Processing...');
    setStatusClass('status-processing');
    addMessageToLog('user', transcript);
    currentTranscriptRef.current = '';

    // Call backend API for processing
    fetch(`${process.env.REACT_APP_API_BASE_URL}/api/chat/voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript,
        clientData: clientDataRef.current,
        sessionId: generateSessionId(),
        confidence: 0.9
      }),
    }).then(res => res.json())
      .then(data => {
        const response = data.response || 'Sorry, I did not understand that.';
        addMessageToLog('ai', response);
        speakText(response);
      })
      .catch(() => {
        const fallbackResponse = generateResponse(transcript.toLowerCase());
        addMessageToLog('ai', fallbackResponse);
        speakText(fallbackResponse);
      })
      .finally(() => {
        setTimeout(() => {
          setIsProcessing(false);
          if (isListening) {
            setStatusText('Listening...');
            setStatusClass('status-listening');
          }
        }, 1000);
      });
  };

  const generateSessionId = () => {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  const addMessageToLog = (sender: string, message: string) => {
    const time = new Date().toLocaleTimeString();
    setConversationLog(prev => [...prev, { sender, message, time }]);
  };

  const speakText = (text: string) => {
    setStatusText('Speaking...');
    setStatusClass('status-speaking');
    if (isListening) {
      stopListening();
    }

    // Try AWS Polly via API
    fetch(`${process.env.REACT_APP_API_BASE_URL}/api/polly/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId: 'Kajal', outputFormat: 'mp3' }),
    }).then(res => res.json())
      .then(data => {
        if (data.success && data.audioUrl) {
          const audio = new Audio(data.audioUrl);
          audio.onended = () => {
            if (isListening) {
              startListening();
            } else {
              setStatusText('Ready');
              setStatusClass('status-idle');
            }
          };
          audio.play();
        } else {
          fallbackSpeak(text);
        }
      })
      .catch(() => {
        fallbackSpeak(text);
      });
  };

  const fallbackSpeak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onend = () => {
      if (isListening) {
        startListening();
      } else {
        setStatusText('Ready');
        setStatusClass('status-idle');
      }
    };
    window.speechSynthesis.speak(utterance);
  };

  const generateResponse = (input: string) => {
    if (input.includes('paid') || input.includes('payment') || input.includes('pay')) {
      return `Thank you for confirming your payment, ${clientName}. Please ensure the payment is processed before the due date. Is there anything else I can help you with regarding your loan?`;
    }
    if (input.includes('balance') || input.includes('outstanding') || input.includes('due amount')) {
      return `Your current outstanding loan amount is ₹${totalDue}. Your next EMI of ₹${emiAmount} is due on ${new Date(dueDate).toLocaleDateString()}.`;
    }
    if (input.includes('emi') || input.includes('installment')) {
      return `Your monthly EMI amount is ₹${emiAmount}. The due date for your next payment is ${new Date(dueDate).toLocaleDateString()}.`;
    }
    if (input.includes('extension') || input.includes('extend') || input.includes('delay')) {
      return `I understand you're requesting an extension, ${clientName}. Please contact our customer service at 1800-123-4567 for payment extension requests. They will be able to assist you with the necessary arrangements.`;
    }
    if (input.includes('help') || input.includes('support')) {
      return `I can help you with information about your loan balance, EMI amount, due dates, and payment confirmations, ${clientName}. For other queries, please contact our customer service at 1800-123-4567.`;
    }
    if (input.includes('bye') || input.includes('goodbye') || input.includes('thank you')) {
      return `Thank you for your time, ${clientName}. Please remember to make your EMI payment of ₹${emiAmount} by ${new Date(dueDate).toLocaleDateString()}. Have a great day!`;
    }
    return `I understand your concern, ${clientName}. For detailed assistance with your loan account, please contact our customer service at 1800-123-4567. Is there anything specific about your EMI or payment that I can help clarify?`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clientDataRef.current = {
      name: clientName,
      mobile: mobileNumber,
      totalDue: parseFloat(totalDue),
      emiAmount: parseFloat(emiAmount),
      dueDate,
    };
    setSuccessMessage('Client data saved successfully');
  };

  return (
    <div className="container">
      <div className="client-form">
        <h1>Client Information</h1>
        <p>Enter client details for EMI reminder call</p>
        <form onSubmit={handleSubmit} id="clientForm">
          <div className="form-group">
            <label htmlFor="clientName">Client Name:</label>
            <input
              type="text"
              id="clientName"
              name="clientName"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="mobileNumber">Mobile Number:</label>
            <input
              type="tel"
              id="mobileNumber"
              name="mobileNumber"
              required
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="totalDue">Total Due Amount (₹):</label>
            <input
              type="number"
              id="totalDue"
              name="totalDue"
              step="0.01"
              required
              value={totalDue}
              onChange={(e) => setTotalDue(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="emiAmount">EMI Amount (₹):</label>
            <input
              type="number"
              id="emiAmount"
              name="emiAmount"
              step="0.01"
              required
              value={emiAmount}
              onChange={(e) => setEmiAmount(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="dueDate">Due Date:</label>
            <input
              type="date"
              id="dueDate"
              name="dueDate"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary" id="startCallBtn">
            Start AI Call
          </button>
        </form>

        <div className="audio-interface" id="audioInterface">
          <div className="status-indicator">
            <span className={`status-dot ${statusClass}`} id="statusDot"></span>
            <span id="statusText">{statusText}</span>
          </div>

          <div className="audio-controls">
            <button
              className="btn-audio btn-start"
              id="startBtn"
              onClick={startListening}
              disabled={isListening}
            >
              Start Listening
            </button>
            <button
              className="btn-audio btn-stop"
              id="stopBtn"
              onClick={stopListening}
              disabled={!isListening}
            >
              Stop
            </button>
            <button
              className="btn-audio"
              id="testMicBtn"
              style={{ background: '#17a2b8', color: 'white' }}
              onClick={() => {
                navigator.mediaDevices.getUserMedia({ audio: true })
                  .then(() => alert('Microphone access granted!'))
                  .catch(() => alert('Microphone access denied.'));
              }}
            >
              Test Microphone
            </button>
          </div>

          <div className="conversation-log" id="conversationLog">
            {conversationLog.map((msg, idx) => (
              <div key={idx} className={`message ${msg.sender}`}>
                <div>{msg.message}</div>
                <div className="message-time">{msg.time}</div>
              </div>
            ))}
          </div>

          {errorMessage && <div className="error-message">{errorMessage}</div>}
          {successMessage && <div className="success-message">{successMessage}</div>}
        </div>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <button
            onClick={() => {
              sessionStorage.clear();
              window.location.href = '/login';
            }}
            style={{ background: 'none', border: 'none', color: '#666', textDecoration: 'underline', cursor: 'pointer' }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiReminderUpdated;
