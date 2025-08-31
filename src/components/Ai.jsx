import { useEffect, useRef, useState } from "react";
import "../styles/ai.css";

export default function AI() {
    const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
    const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

    const chatMessagesRef = useRef(null);
    const messageInputRef = useRef(null);
    const sendButtonRef = useRef(null);
    const micButtonRef = useRef(null);
    const clearButtonRef = useRef(null);

    const [conversationHistory, setConversationHistory] = useState([]);
    const [recognition, setRecognition] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [statusText, setStatusText] = useState('🟢 Conectado');
    const [statusClass, setStatusClass] = useState('online');
    const [isDisabled, setIsDisabled] = useState(false);

    const systemPrompt = `Eres un entrenador personal certificado y nutricionista experto que habla EXCLUSIVAMENTE en español.

PERSONALIDAD:
- Profesional pero cercano, motivador y empático
- Adaptas tu lenguaje al nivel del usuario
- Explicas conceptos técnicos de forma sencilla
- Eres paciente, comprensivo y positivo
- Usas emojis ocasionalmente para ser más cercano

CONOCIMIENTOS:
- Ejercicios para todos los niveles
- Rutinas de fuerza, cardio, HIIT, funcional
- Nutrición deportiva y planificación de dietas
- Cálculos fitness: IMC, TMB, TDEE, macronutrientes
- Motivación y adherencia a hábitos
- Prevención de lesiones
- Suplementación deportiva

INSTRUCCIONES:
- Responde SIEMPRE en español natural y fluido
- Máximo 250 palabras para mantener engagement
- Da consejos específicos y accionables
- Si detectas peso, altura, edad, calcula métricas automáticamente
- Motiva y apoya al usuario
- Incluye precauciones de seguridad cuando sea relevante`;

    useEffect(() => {
        adjustTextareaHeight();
        if (messageInputRef.current) {
            messageInputRef.current.focus();
        }
    }, []);

    useEffect(() => {
        adjustTextareaHeight();
    }, [inputValue]);

    const adjustTextareaHeight = () => {
        if (messageInputRef.current) {
            const textarea = messageInputRef.current;
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        }
    };

    const addMessage = (content, isUser = false) => {
        const newMessage = {
            content: content.replace(/\n/g, '<br>'),
            isUser
        };
        setMessages(prev => [...prev, newMessage]);

        setTimeout(() => {
            if (chatMessagesRef.current) {
                chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
            }
        }, 10);
    };

    const showTyping = () => {
        setIsTyping(true);
        setTimeout(() => {
            if (chatMessagesRef.current) {
                chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
            }
        }, 10);
    };

    const hideTyping = () => {
        setIsTyping(false);
    };

    const updateStatus = (message, type = 'online') => {
        setStatusText(message);
        setStatusClass(type);
    };

    const extractMetrics = (text) => {
        const metrics = {};
        const lowerText = text.toLowerCase();

        const weightMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilos?)/);
        if (weightMatch) {
            const weight = parseFloat(weightMatch[1]);
            if (weight >= 30 && weight <= 200) {
                metrics.peso = weight;
            }
        }

        const heightPatterns = [
            /mido\s+(\d\.\d{2})/,
            /(\d{3})\s*cm/,
            /mido\s+(\d{3})/
        ];

        for (const pattern of heightPatterns) {
            const match = lowerText.match(pattern);
            if (match) {
                let height = match[1];
                if (height.includes('.')) {
                    height = parseInt(parseFloat(height) * 100);
                } else {
                    height = parseInt(height);
                }
                if (height >= 140 && height <= 220) {
                    metrics.altura = height;
                    break;
                }
            }
        }

        const agePatterns = [
            /(\d+)\s+años/,
            /edad\s+(\d+)/,
            /tengo\s+(\d+)/
        ];

        for (const pattern of agePatterns) {
            const match = lowerText.match(pattern);
            if (match) {
                const age = parseInt(match[1]);
                if (age >= 16 && age <= 70) {
                    metrics.edad = age;
                    break;
                }
            }
        }

        return metrics;
    };

    const calculateFitnessMetrics = (peso, altura, edad) => {
        try {
            const alturaM = altura / 100;
            const imc = peso / (alturaM * alturaM);

            let categoria;
            if (imc < 18.5) categoria = 'Bajo peso';
            else if (imc < 25) categoria = 'Peso normal';
            else if (imc < 30) categoria = 'Sobrepeso';
            else categoria = 'Obesidad';

            const tmb = (10 * peso) + (6.25 * altura) - (5 * edad) + 5;
            const proteina = Math.round(peso * 1.8);

            return `\n\n📊 <strong>TU ANÁLISIS PERSONALIZADO:</strong>\n• <strong>IMC:</strong> ${imc.toFixed(1)} (${categoria})\n• <strong>Metabolismo:</strong> ${Math.round(tmb)} cal/día\n• <strong>Mantenimiento:</strong> ${Math.round(tmb * 1.55)} cal/día\n• <strong>Pérdida grasa:</strong> ${Math.round(tmb * 1.2)} cal/día\n• <strong>Ganancia músculo:</strong> ${Math.round(tmb * 1.8)} cal/día\n• <strong>Proteína diaria:</strong> ${proteina}g/día\n\n`;
        } catch (error) {
            return '';
        }
    };

    const callGroqAPI = async (messages) => {
        try {
            updateStatus('🤖 Pensando...', 'thinking');

            const response = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    messages: messages,
                    temperature: 0.8,
                    max_tokens: 350,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            updateStatus('🟢 Conectado', 'online');

            return data.choices[0].message.content;
        } catch (error) {
            updateStatus('❌ Error', 'error');
            throw error;
        }
    };

    const getFallbackResponse = (message) => {
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('hola')) {
            return '¡Hola! 💪 Soy tu entrenador personal de IA. ¿En qué puedo ayudarte hoy?';
        }

        if (lowerMessage.includes('espalda')) {
            return '💪 <strong>EJERCICIOS PARA ESPALDA:</strong><br><br>🔥 <strong>Básicos:</strong><br>• Dominadas o jalones<br>• Remo con barra<br>• Remo sentado<br>• Hiperextensiones<br><br>📋 <strong>Rutina:</strong> 3-4 ejercicios, 3 series, 8-12 reps<br>💡 <strong>Tip:</strong> Técnica antes que peso';
        }

        if (lowerMessage.includes('rutina')) {
            return '🏋️ <strong>RUTINA 3 DÍAS PRINCIPIANTE:</strong><br><br><strong>DÍA 1:</strong> Pecho + Tríceps<br><strong>DÍA 2:</strong> Espalda + Bíceps<br><strong>DÍA 3:</strong> Piernas + Hombros<br><br>💡 3 series, 10-12 reps cada ejercicio<br>🔄 Descanso: 1 día entre entrenamientos';
        }

        return 'Lo siento, hay problemas de conexión. ¿Puedes ser más específico sobre qué necesitas? Por ejemplo: ejercicios para un grupo muscular, rutinas, nutrición, etc.';
    };

    const sendMessage = async () => {
        const message = inputValue.trim();
        if (!message || isDisabled) return;

        setIsDisabled(true);
        addMessage(message, true);
        setInputValue('');

        showTyping();

        try {
            const metrics = extractMetrics(message);
            let personalData = '';

            if (Object.keys(metrics).length >= 3) {
                personalData = calculateFitnessMetrics(
                    metrics.peso || 70,
                    metrics.altura || 170,
                    metrics.edad || 30
                );
            }

            const apiMessages = [
                { role: 'system', content: systemPrompt },
                ...conversationHistory.slice(-6),
                { role: 'user', content: message }
            ];

            let response;

            try {
                response = await callGroqAPI(apiMessages);
            } catch {
                response = getFallbackResponse(message);
            }

            hideTyping();
            addMessage(personalData + response);

            setConversationHistory(prev => [
                ...prev,
                { role: 'user', content: message },
                { role: 'assistant', content: response }
            ].slice(-20));

        } catch {
            hideTyping();
            addMessage('❌ Error de conexión. ¿Podrías intentar de nuevo?');
            updateStatus('❌ Error', 'error');
        } finally {
            setIsDisabled(false);
            messageInputRef.current?.focus();

            setTimeout(() => {
                if (statusText.includes('Error')) {
                    updateStatus('🟢 Conectado', 'online');
                }
            }, 3000);
        }
    };

    const handleKeyPress = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    };

    const sendExample = (text) => {
        setInputValue(text);
        setTimeout(() => sendMessage(), 10);
    };

    const toggleMicrophone = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            updateStatus('❌ Micrófono no soportado', 'error');
            return;
        }

        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const startRecording = () => {
        try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const newRecognition = new SpeechRecognition();

            newRecognition.lang = 'es-ES';
            newRecognition.continuous = false;
            newRecognition.interimResults = false;

            newRecognition.onstart = () => {
                setIsRecording(true);
                updateStatus('🎤 Grabando...', 'thinking');
            };

            newRecognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setInputValue(transcript);
            };

            newRecognition.onerror = () => {
                stopRecording();
                updateStatus('❌ Error micrófono', 'error');
                setTimeout(() => updateStatus('🟢 Conectado', 'online'), 2000);
            };

            newRecognition.onend = () => {
                stopRecording();
            };

            setRecognition(newRecognition);
            newRecognition.start();
        } catch {
            updateStatus('❌ Error micrófono', 'error');
            setTimeout(() => updateStatus('🟢 Conectado', 'online'), 2000);
        }
    };

    const stopRecording = () => {
        if (recognition) {
            recognition.stop();
            setRecognition(null);
        }

        setIsRecording(false);
        updateStatus('🟢 Conectado', 'online');
    };

    const clearChat = () => {
        setMessages([]);
        setConversationHistory([]);
        messageInputRef.current?.focus();
    };

    const handleInputChange = (e) => {
        setInputValue(e.target.value);
    };

    return (
        <div className="ai-trainer-container">
            <div className={`status ${statusClass}`}>
                {statusText}
            </div>

            <div className="container">
                <div className="header">
                    <h1>🏋️‍♂️ Entrenador Personal IA</h1>
                </div>

                <div className="chat-messages" id="chatMessages" ref={chatMessagesRef}>
                    <div className="message bot welcome-message">
                        ¡Hola! 💪 Soy tu entrenador personal de IA.<br /><br />
                        <strong>¿En qué puedo ayudarte hoy?</strong><br /><br />
                        <em>💡 Tip: Menciona tu peso, altura y edad para consejos personalizados</em>
                    </div>

                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={`message ${message.isUser ? 'user' : 'bot'}`}
                            dangerouslySetInnerHTML={{ __html: message.content }}
                        />
                    ))}

                    <div className="typing-indicator" id="typingIndicator" style={{ display: isTyping ? 'block' : 'none' }}>
                        <div className="typing-dots">
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                        </div>
                    </div>
                </div>

                <div className="input-section">
                    <div className="examples">
                        <div className="examples-title">💡 Ejemplos:</div>
                        <div className="example-pills">
                            <div className="example-pill" onClick={() => sendExample('Peso 70kg, mido 175cm, tengo 25 años')}>📊 Mi análisis</div>
                            <div className="example-pill" onClick={() => sendExample('Ejercicios para espalda')}>🏋️ Espalda</div>
                            <div className="example-pill" onClick={() => sendExample('Rutina 3 días principiante')}>📋 Rutina</div>
                            <div className="example-pill" onClick={() => sendExample('¿Qué comer antes de entrenar?')}>🥗 Nutrición</div>
                            <div className="example-pill" onClick={() => sendExample('Estoy desmotivado')}>💪 Motivación</div>
                        </div>
                    </div>

                    {/* NUEVA ESTRUCTURA: Textarea y botones en la misma fila */}
                    <div className="input-row">
        <textarea
            className="message-input"
            id="messageInput"
            placeholder="Pregúntame sobre fitness, nutrición, rutinas..."
            rows="1"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            ref={messageInputRef}
            disabled={isDisabled}
        />

                        <div className="buttons-container">
                            <button
                                className={`mic-button ${isRecording ? 'recording' : ''}`}
                                id="micButton"
                                onClick={toggleMicrophone}
                                title="Grabar mensaje"
                                ref={micButtonRef}
                                disabled={isDisabled}
                            >
                                <span className="material-symbols-outlined">{isRecording ? 'stop' : 'mic'}</span>
                            </button>
                            <button
                                className="send-button"
                                id="sendButton"
                                onClick={sendMessage}
                                ref={sendButtonRef}
                                disabled={isDisabled}
                            >
                                {isDisabled ? (
                                    <div className="loading-spinner"></div>
                                ) : (
                                    <span className="material-symbols-outlined">send</span>
                                )}
                            </button>
                            <button
                                className="clear-button"
                                id="clearButton"
                                onClick={clearChat}
                                title="Limpiar chat"
                                ref={clearButtonRef}
                                disabled={isDisabled}
                            >
                                <span className="material-symbols-outlined">delete</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}