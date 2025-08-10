import { useEffect, useRef, useState } from "react";
import { useNavigate } from 'react-router-dom';
import confetti from "canvas-confetti";
import { Notyf } from "notyf";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import useTTS from "../hooks/useTTS.js";
import "notyf/notyf.min.css";
import 'animate.css';
import "../styles/general.css";
import "../styles/checkCode.css";

const codeRegex = /^[0-9]{6}$/;
const API_BASE_URL = 'https://myfitapp.onrender.com';

export default function CheckCode() {
    const navigate = useNavigate();
    const formRef = useRef(null);
    const checkCodeRef = useRef(null);
    const sendCodeButtonRef = useRef(null);
    const speakBtnRef = useRef(null);
    const rulesContainerRef = useRef(null);
    const codeRuleRef = useRef(null);

    const [allRight, setAllRight] = useState(false);
    const [alreadyCelebrated, setAlreadyCelebrated] = useState(false);
    const [status, setStatus] = useState('idle');
    const isLoading = status === 'loading';
    const isSuccess = status === 'success';
    const isError = status === 'error';

    useTTS(speakBtnRef, rulesContainerRef);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const checkCodeParam = params.get("checkCode");
        if (checkCodeParam && checkCodeRef.current) {
            checkCodeRef.current.value = checkCodeParam;
            validateInput({ target: checkCodeRef.current });
        }
    }, []);

    useEffect(() => {
        if (!sendCodeButtonRef.current) return;

        if (allRight && status === 'idle') {
            sendCodeButtonRef.current.classList.add('bounce-animation');

            if (!alreadyCelebrated) {
                setAlreadyCelebrated(true);
                const rect = sendCodeButtonRef.current.getBoundingClientRect();
                const x = (rect.left + rect.right) / 2 / window.innerWidth;
                const y = (rect.top + rect.bottom) / 2 / window.innerHeight;
                confetti({ particleCount: 150, spread: 70, origin: { x, y } });
            }
        } else {
            sendCodeButtonRef.current.classList.remove('bounce-animation');
            if (!allRight) {
                setAlreadyCelebrated(false);
            }
        }
    }, [allRight, status, alreadyCelebrated]);

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

    const validateInput = (event) => {
        const target = event.target;

        const isCodeValid = checkCodeRef.current.value.trim() !== "" &&
            codeRegex.test(checkCodeRef.current.value.trim());

        if (target === checkCodeRef.current) {
            codeRuleRef.current.style.color = isCodeValid ? "green" : "#ff3c00";
            codeRuleRef.current.classList.remove("animate__animated", "animate__headShake");
            void codeRuleRef.current.offsetWidth;
            codeRuleRef.current.classList.add("animate__animated", isCodeValid ? "custom-pulse" : "animate__headShake");
        }

        const newAllRight = isCodeValid;
        setAllRight(newAllRight);

        updateButtonStyles(newAllRight);
    };

    const validateData = (data) => {
        if(!data.verificationCode){
            showErrorMessage('Invalid data');
            return false;
        }

        if(!codeRegex.test(data.verificationCode)){
            showErrorMessage('Invalid verification code format');
            return false;
        }

        return true;
    }

    const updateButtonStyles = (isValid) => {
        if (sendCodeButtonRef.current && status !== 'loading') {
            sendCodeButtonRef.current.disabled = !isValid;
            sendCodeButtonRef.current.classList.toggle("enabled", isValid);
            sendCodeButtonRef.current.style.backgroundColor = isValid ? "#2563eb" : "#ff3c00";
            sendCodeButtonRef.current.style.cursor = isValid ? "pointer" : "not-allowed";
        }

        if (isValid && status === 'idle') {
            sendCodeButtonRef.current.classList.add('bounce-animation');
            if (!alreadyCelebrated) {
                setAlreadyCelebrated(true);
                const rect = sendCodeButtonRef.current.getBoundingClientRect();
                const x = (rect.left + rect.right) / 2 / window.innerWidth;
                const y = (rect.top + rect.bottom) / 2 / window.innerHeight;
                confetti({ particleCount: 150, spread: 70, origin: { x, y } });
            }
        } else {
            sendCodeButtonRef.current.classList.remove('bounce-animation');
            if (!isValid) {
                setAlreadyCelebrated(false);
            }
        }
    };

    const checkCodee = async () => {
        try {
            const data = {
                verificationCode: checkCodeRef.current.value
            };

            if(!validateData(data)){
                return;
            }

            setStatus('loading');

            const response = await fetch(`${API_BASE_URL}/api/users/checkCode`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
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

            setTimeout(() => {
                navigate('/login');
            }, 2000);

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
            sendCodeButtonRef.current.classList.remove('bounce-animation');
            formRef.current.classList.add('shake');
            setTimeout(() => formRef.current.classList.remove('shake'), 400);
        } else {
            checkCodee();
        }
    };

    const handleFocus = (e) => {
        e.target.style.border = '1px solid #5057d4';
        e.target.style.outline = 'none';
        e.target.style.boxShadow = '0 0 5px #5057d4';
    };

    const handleBlur = (e) => {
        e.target.style.border = "1px solid #3b4550";
        e.target.style.boxShadow = 'none';
    };

    const handleDblClick = (e) => {
        e.target.value = "";
        validateInput(e);
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
                        <p id="code_rule" ref={codeRuleRef}>
                            <b>Code</b>: 6 numbers
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
                        <label htmlFor="check_code">Code</label>
                        <input
                            type="text"
                            id="check_code"
                            placeholder="123456"
                            required
                            minLength="6"
                            maxLength="6"
                            ref={checkCodeRef}
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
                                checkcode-btn 
                                ${allRight ? 'enabled' : ''} 
                                ${isSuccess ? 'btn-success' : ''} 
                                ${isError ? 'btn-error' : ''}
                                ${isLoading ? 'loading' : ''}
                            `}
                            disabled={!allRight || isLoading}
                            style={{
                                backgroundColor: "#ff5900",
                                cursor: (!allRight || isLoading) ? "not-allowed" : "pointer",
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            id="send_code"
                            ref={sendCodeButtonRef}
                        >
                            {isLoading ? <LottieAnimation /> : "Check"}
                        </button>
                    </div>
                </form>
            </fieldset>
        </>
    );
}