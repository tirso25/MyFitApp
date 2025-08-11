import { useEffect, useRef, useState } from "react";
import { useNavigate } from 'react-router-dom';
import CryptoJS from "crypto-js";
import confetti from "canvas-confetti";
import { Notyf } from "notyf";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import useTTS from "../hooks/useTTS.js";
import "notyf/notyf.min.css";
import 'animate.css';
import "../styles/general.css";
import "../styles/checkCode.css";

const emailRegex = /^(?=.{9,255}$)[a-zA-Z0-9._%+-]+@(gmail|yahoo|outlook|hotmail)\.(com|es)$/;
const API_BASE_URL = 'https://myfitapp.onrender.com';

export default function CheckEmail() {
    const navigate = useNavigate();
    const formRef = useRef(null);
    const emailRef = useRef(null);
    const emailRuleRef = useRef(null);
    const sendButtonRef = useRef(null);
    const speakBtnRef = useRef(null);
    const rulesContainerRef = useRef(null);

    const [allRight, setAllRight] = useState(false);
    const [alreadyCelebrated, setAlreadyCelebrated] = useState(false);
    const [typeURL, setTypeURL] = useState(null);
    const [status, setStatus] = useState('idle');
    const isLoading = status === 'loading';
    const isSuccess = status === 'success';
    const isError = status === 'error';

    useTTS(speakBtnRef, rulesContainerRef);

    useEffect(() => {
        initializeButtonStyles();

        const params = new URLSearchParams(window.location.search);
        setTypeURL(params.get("type"));

        const decryptedEmail = getDecryptedEmailFromURL();
        if (decryptedEmail) {
            emailRef.current.value = decryptedEmail;
        } else {
            const emailParam = params.get("email");
            if (emailParam) {
                try {
                    emailRef.current.value = decodeURIComponent(emailParam);
                } catch {
                    emailRef.current.value = emailParam;
                }
            }
        }

        validateInput({ target: emailRef.current });
    }, []);

    useEffect(() => {
        if (!sendButtonRef.current) return;

        if (allRight && status === 'idle') {
            sendButtonRef.current.classList.add('bounce-animation');

            if (!alreadyCelebrated) {
                setAlreadyCelebrated(true);
                const rect = sendButtonRef.current.getBoundingClientRect();
                const x = (rect.left + rect.right) / 2 / window.innerWidth;
                const y = (rect.top + rect.bottom) / 2 / window.innerHeight;
                confetti({ particleCount: 150, spread: 70, origin: { x, y } });
            }
        } else {
            sendButtonRef.current.classList.remove('bounce-animation');
            if (!allRight) {
                setAlreadyCelebrated(false);
            }
        }
    }, [allRight, status, alreadyCelebrated]);

    const initializeButtonStyles = () => {
        if (sendButtonRef.current) {
            sendButtonRef.current.disabled = true;
            sendButtonRef.current.style.backgroundColor = "#ff3c00";
            sendButtonRef.current.style.cursor = "not-allowed";
            sendButtonRef.current.classList.remove("enabled");
        }
    };

    const LottieAnimation = () => {
        return (
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <DotLottieReact
                    src="/animations/loading.lottie"
                    loop
                    autoplay
                    style={{
                        width: '80%',
                        height: '80%'
                    }}
                />
            </div>
        );
    };

    const decodeFromURL = (encodedText) => {
        let base64 = encodedText.replace(/-/g, "+").replace(/_/g, "/");
        while (base64.length % 4) base64 += "=";
        return atob(base64);
    };

    const getDecryptedEmailFromURL = () => {
        const params = new URLSearchParams(window.location.search);
        const encryptedEmail = params.get("email");
        const encryptedKey = params.get("key");

        if (encryptedEmail && encryptedKey) {
            try {
                const decodedData = decodeFromURL(encryptedEmail);
                const decodedKey = decodeFromURL(encryptedKey);
                return CryptoJS.AES.decrypt(decodedData, decodedKey).toString(CryptoJS.enc.Utf8);
            } catch (e) {
                console.error("Error al descifrar:", e);
                return null;
            }
        }
        return null;
    };

    const applyValidationAnimation = (element, isValid) => {
        if (!element) return;

        element.classList.remove(
            "animate__animated",
            "animate__headShake",
            "custom-pulse",
            "custom-pulse-subtle",
            "custom-pulse-opacity"
        );

        void element.offsetWidth;

        element.style.color = isValid ? "green" : "#ff3c00";

        element.classList.add("animate__animated");
        element.classList.add(isValid ? "custom-pulse" : "animate__headShake");

        setTimeout(() => {
            element.classList.remove(
                "animate__animated",
                "animate__headShake",
                "custom-pulse"
            );
        }, 2000);
    };

    const validateInput = (event) => {
        const target = event.target;

        if (!emailRef.current) {
            return;
        }

        const emailValue = emailRef.current.value.trim();
        const isEmailValid = emailValue !== "" && emailRegex.test(emailValue);

        if (target === emailRef.current && emailRuleRef.current) {
            applyValidationAnimation(emailRuleRef.current, isEmailValid);
        }

        const newAllRight = isEmailValid;
        setAllRight(newAllRight);

        updateButtonStyles(newAllRight);
    };

    const validateData = (data) => {
        if (!data.email) {
            showErrorMessage('Invalid data');
            return false;
        }

        if (!emailRegex.test(data.email)) {
            showErrorMessage('Invalid email format');
            return false;
        }

        return true;
    }

    const updateButtonStyles = (isValid) => {
        if (sendButtonRef.current && status !== 'loading') {
            sendButtonRef.current.disabled = !isValid;
            sendButtonRef.current.classList.toggle("enabled", isValid);
            sendButtonRef.current.style.backgroundColor = isValid ? "#2563eb" : "#ff3c00";
            sendButtonRef.current.style.cursor = isValid ? "pointer" : "not-allowed";
        }
    };

    const sendEmail = async () => {
        try {
            const data = {
                email: emailRef.current.value,
                type: typeURL,
            };

            if(!validateData(data)) {
                return;
            }

            setStatus('loading');

            const response = await fetch(`${API_BASE_URL}/api/users/sendEmail`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            const message = await response.json();

            if (!response.ok) {
                if (formRef.current) {
                    formRef.current.classList.add('shake');
                    setTimeout(() => formRef.current?.classList.remove('shake'), 400);
                }
                setStatus('error');

                const notyf = new Notyf();
                notyf.error({
                    message: message.message,
                    duration: 4000,
                    dismissible: true,
                    position: { x: 'right', y: 'top' },
                });

                setTimeout(() => setStatus('idle'), 2000);
                return;
            }

            setStatus('success');
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });

            const notyf = new Notyf();
            notyf.success({
                message: message.message,
                duration: 2000,
                dismissible: true,
                position: { x: 'right', y: 'top' },
            });

            const urlParams = new URLSearchParams(window.location.search);
            let type = urlParams.get('type');

            switch(type) {
                case 'activateAccount':
                    setTimeout(() => {
                        navigate('/checkCode');
                    }, 2000);
                    break;
                case 'changePassword':
                    setTimeout(() => {
                        navigate('/changePassword');
                    }, 2000);
                    break;
            }


        } catch (error) {
            console.error("Error:", error);
            setStatus('error');

            const notyf = new Notyf();
            notyf.error({
                message: "A network error has occurred.",
                duration: 4000,
                dismissible: true,
                position: { x: 'right', y: 'top' },
            });

            setTimeout(() => setStatus('idle'), 2000);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!allRight || status === 'loading') {
            setAlreadyCelebrated(false);
            formRef.current.classList.add('shake');
            setTimeout(() => formRef.current.classList.remove('shake'), 400);
        } else {
            sendEmail();
        }
    };

    const handleFocus = (e) => {
        e.target.style.border = "1px solid #5057d4";
        e.target.style.outline = "none";
        e.target.style.boxShadow = "0 0 5px #5057d4";
    };

    const handleBlur = (e) => {
        e.target.style.border = "1px solid #3b4550";
        e.target.style.boxShadow = "none";
    };

    const handleDblClick = (e) => {
        e.target.value = "";
        validateInput({ target: e.target });
    };

    const showErrorMessage = (message) => {
        console.error('Error:', message);
        const notyf = new Notyf();
        notyf.error({
            message: message,
            duration: 4000,
            dismissible: true,
            position: { x: 'right', y: 'top' },
        });
    };

    return (
        <>
            <fieldset>
                <div className="rules-container" ref={rulesContainerRef}>
                    <div id="rules">
                        <p id="email_rule" ref={emailRuleRef}>
                            <b>Email</b>: Correct formatting
                        </p>
                    </div>
                    <button className="tts-btn" id="speakRulesBtn" ref={speakBtnRef}>
                        <span className="material-symbols-outlined">volume_up</span>
                    </button>
                </div>
            </fieldset>
            <br />
            <fieldset id="checkCode">
                <form id="checkCodeForm" ref={formRef} onSubmit={handleSubmit}>
                    <div id="content1">
                        <label htmlFor="send_email">Email</label>
                        <input
                            type="text"
                            id="send_email"
                            placeholder="email@gmail.com/es"
                            minLength="9"
                            maxLength="255"
                            autoComplete="email"
                            required
                            ref={emailRef}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            onInput={validateInput}
                            onDoubleClick={handleDblClick}
                        />
                    </div>
                    <div id="content2">
                        <button
                            type="submit"
                            className={`
                                send-btn 
                                ${allRight ? 'enabled' : ''} 
                                ${isSuccess ? 'btn-success' : ''} 
                                ${isError ? 'btn-error' : ''}
                                ${isLoading ? 'loading' : ''}
                            `}
                            disabled={!allRight || isLoading}
                            id="sendEmail"
                            ref={sendButtonRef}
                            style={{
                                cursor: (!allRight || isLoading) ? 'not-allowed' : 'pointer',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            {isLoading ? <LottieAnimation /> : "Send"}
                        </button>
                    </div>
                </form>
            </fieldset>
        </>
    );
}