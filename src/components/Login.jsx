import { useEffect, useRef, useState } from "react";
import { useNavigate } from 'react-router-dom';
import confetti from "canvas-confetti";
import { Notyf } from "notyf";
import useTTS from "../hooks/useTTS.js";
import "notyf/notyf.min.css";
import 'animate.css';
import "../styles/general.css";
import "../styles/login.css";

const emailRegex = /^(?=.{9,255}$)[a-zA-Z0-9._%+-]+@(gmail|yahoo|outlook|hotmail)\.(com|es)$/;
const usernameRegex = /^[a-z0-9]{5,20}$/;
const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{5,255}$/;
const API_BASE_URL = 'https://myfitapp.onrender.com';

export default function Login() {
    const navigate = useNavigate();
    const formRef = useRef(null);
    const emailRef = useRef(null);
    const passwordRef = useRef(null);
    const loginButtonRef = useRef(null);
    const rememberMeRef = useRef(null);
    const speakBtnRef = useRef(null);
    const rulesContainerRef = useRef(null);
    const googleButtonRef = useRef(null);

    const emailRuleRef = useRef(null);
    const pwdRuleRef = useRef(null);
    const countRef = useRef(null);

    const [passwordVisible, setPasswordVisible] = useState(false);
    const [allRight, setAllRight] = useState(false);
    const [alreadyCelebrated, setAlreadyCelebrated] = useState(false);
    const [status, setStatus] = useState('idle');
    const isLoading = status === 'loading';
    const isSuccess = status === 'success';
    const isError = status === 'error';

    useTTS(speakBtnRef, rulesContainerRef);

    useEffect(() => {
        initializeCounterStyles();
        initializeButtonStyles();
        handleAuthCallback();
    }, []);

    useEffect(() => {
        if (!loginButtonRef.current) return;

        if (allRight && status === 'idle') {
            loginButtonRef.current.classList.add('bounce-animation');

            if (!alreadyCelebrated) {
                setAlreadyCelebrated(true);
                const rect = loginButtonRef.current.getBoundingClientRect();
                const x = (rect.left + rect.right) / 2 / window.innerWidth;
                const y = (rect.top + rect.bottom) / 2 / window.innerHeight;
                confetti({ particleCount: 150, spread: 70, origin: { x, y } });
            }
        } else {
            loginButtonRef.current.classList.remove('bounce-animation');
            if (!allRight) {
                setAlreadyCelebrated(false);
            }
        }
    }, [allRight, status, alreadyCelebrated]);

    const initializeButtonStyles = () => {
        if (loginButtonRef.current) {
            loginButtonRef.current.disabled = true;
            loginButtonRef.current.style.backgroundColor = "#ff3c00";
            loginButtonRef.current.style.cursor = "not-allowed";
            loginButtonRef.current.classList.remove("enabled");
        }
    };

    const DVDAnimation = () => {
        const canvasRef = useRef(null);
        const animationRef = useRef(null);
        const mountedRef = useRef(true);
        const isMobileRef = useRef(window.innerWidth <= 768);
        const canvasSizeRef = useRef({ width: 0, height: 0 });
        const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

        useEffect(() => {
            mountedRef.current = true;
            const canvas = canvasRef.current;
            if (!canvas) return;

            let ctx;
            try {
                ctx = canvas.getContext('2d');
                if (!ctx) return;
            } catch (err) {
                console.warn("Canvas context failed:", err);
                return;
            }

            const updateCanvasSize = () => {
                if (!canvas || !mountedRef.current) return null;
                const button = canvas.closest('button');
                if (!button) return null;
                const buttonRect = button.getBoundingClientRect();
                const padding = 4;
                const width = Math.max(buttonRect.width - padding * 2, 40);
                const height = Math.max(buttonRect.height - padding * 2, 20);

                canvas.width = width * window.devicePixelRatio;
                canvas.height = height * window.devicePixelRatio;
                canvas.style.width = width + 'px';
                canvas.style.height = height + 'px';

                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
                canvasSizeRef.current = { width, height };
                setDimensions({ width, height });
                return canvasSizeRef.current;
            };

            if (!updateCanvasSize()) return;

            let x = 10;
            let y = 10;
            let dx = 0.3;
            let dy = 0.3;
            const logoWidth = 30;
            const logoHeight = 15;
            const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8000', '#8000ff'];
            let colorIndex = 0;

            const drawDVD = () => {
                const { width, height } = canvasSizeRef.current;
                ctx.clearRect(0, 0, width, height);

                x += dx;
                y += dy;

                if (x + logoWidth >= width || x <= 0) {
                    dx = -dx;
                    colorIndex = (colorIndex + 1) % colors.length;
                }
                if (y + logoHeight >= height || y <= 0) {
                    dy = -dy;
                    colorIndex = (colorIndex + 1) % colors.length;
                }

                ctx.fillStyle = colors[colorIndex];
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('DVD', x + logoWidth / 2, y + logoHeight / 2 + 3);

                ctx.strokeStyle = colors[colorIndex];
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, logoWidth, logoHeight);
            };

            const loop = () => {
                if (!mountedRef.current) return;
                if (!isMobileRef.current) {
                    drawDVD();
                }
                animationRef.current = requestAnimationFrame(loop);
            };

            if (!isMobileRef.current) {
                animationRef.current = requestAnimationFrame(loop);
            }

            const resizeObserver = new ResizeObserver(() => {
                const prevMobile = isMobileRef.current;
                const newMobile = window.innerWidth <= 768;
                const sizeUpdated = updateCanvasSize();
                if (!sizeUpdated) return;

                if (newMobile !== prevMobile) {
                    isMobileRef.current = newMobile;
                    x = 10;
                    y = 10;
                    colorIndex = 0;

                    if (animationRef.current) {
                        cancelAnimationFrame(animationRef.current);
                        animationRef.current = null;
                    }

                    if (!newMobile) {
                        animationRef.current = requestAnimationFrame(loop);
                    }
                }
            });

            const button = canvas.closest('button');
            if (button) {
                resizeObserver.observe(button);
            }

            const handleResize = () => {
                const newMobile = window.innerWidth <= 768;
                if (newMobile !== isMobileRef.current) {
                    isMobileRef.current = newMobile;
                    x = 10;
                    y = 10;
                    colorIndex = 0;
                }
                updateCanvasSize();
            };

            window.addEventListener('resize', handleResize);

            return () => {
                mountedRef.current = false;
                if (animationRef.current) {
                    cancelAnimationFrame(animationRef.current);
                    animationRef.current = null;
                }
                resizeObserver.disconnect();
                window.removeEventListener('resize', handleResize);
            };
        }, []);

        const PacmanGhost = () => {
            const baseSize = Math.min(dimensions.width, dimensions.height);
            const scale = Math.min(baseSize / 80, 0.8);

            return (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                }}>
                    <div style={{
                        position: 'relative',
                        transform: `scale(${scale})`,
                        transformOrigin: 'center center',
                        animation: 'ghostUpDown 1s ease-in-out infinite'
                    }}>
                        <div style={{
                            position: 'relative',
                            width: '70px',
                            height: '70px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(14, 1fr)',
                            gridTemplateRows: 'repeat(14, 1fr)',
                            gridGap: '0px',
                            gridTemplateAreas: `
                                "a1  a2  a3  a4  a5  top0  top0  top0  top0  a10 a11 a12 a13 a14"
                                "b1  b2  b3  top1 top1 top1 top1 top1 top1 top1 top1 b12 b13 b14"
                                "c1 c2 top2 top2 top2 top2 top2 top2 top2 top2 top2 top2 c13 c14"
                                "d1 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 d14"
                                "e1 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 e14"
                                "f1 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 f14"
                                "top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4"
                                "top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4"
                                "top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4"
                                "top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4"
                                "top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4"
                                "top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4"
                                "st0 st0 an4 st1 an7 st2 an10 an10 st3 an13 st4 an16 st5 st5"
                                "an1 an2 an3 an5 an6 an8 an9 an9 an11 an12 an14 an15 an17 an18"
                            `
                        }}>
                            {['top0', 'top1', 'top2', 'top3', 'top4', 'st0', 'st1', 'st2', 'st3', 'st4', 'st5'].map(area => (
                                <div key={area} style={{ gridArea: area, backgroundColor: 'red' }}></div>
                            ))}

                            {[
                                { area: 'an1', anim: 'flicker0' },
                                { area: 'an18', anim: 'flicker0' },
                                { area: 'an2', anim: 'flicker1' },
                                { area: 'an17', anim: 'flicker1' },
                                { area: 'an3', anim: 'flicker1' },
                                { area: 'an16', anim: 'flicker1' },
                                { area: 'an4', anim: 'flicker1' },
                                { area: 'an15', anim: 'flicker1' },
                                { area: 'an6', anim: 'flicker0' },
                                { area: 'an12', anim: 'flicker0' },
                                { area: 'an7', anim: 'flicker0' },
                                { area: 'an13', anim: 'flicker0' },
                                { area: 'an9', anim: 'flicker1' },
                                { area: 'an10', anim: 'flicker1' },
                                { area: 'an8', anim: 'flicker0' },
                                { area: 'an11', anim: 'flicker0' }
                            ].map(({ area, anim }) => (
                                <div key={area} style={{
                                    gridArea: area,
                                    backgroundColor: 'red',
                                    animation: `${anim} 1s infinite`
                                }}></div>
                            ))}
                        </div>

                        <div style={{
                            position: 'absolute',
                            top: '15px',
                            left: '5px',
                            width: '20px',
                            height: '25px',
                        }}>
                            <div style={{
                                width: '10px',
                                height: '25px',
                                backgroundColor: '#ffffff',
                                position: 'absolute',
                                left: '5px'
                            }}></div>
                            <div style={{
                                width: '20px',
                                height: '15px',
                                backgroundColor: '#ffffff',
                                position: 'absolute',
                                top: '5px'
                            }}></div>
                            <div style={{
                                width: '8px',
                                height: '8px',
                                backgroundColor: '#2563eb',
                                position: 'absolute',
                                top: '10px',
                                left: '6px',
                                animation: 'eyesMovement 2s infinite'
                            }}></div>
                        </div>

                        <div style={{
                            position: 'absolute',
                            top: '15px',
                            right: '5px',
                            width: '20px',
                            height: '25px',
                        }}>
                            <div style={{
                                width: '10px',
                                height: '25px',
                                backgroundColor: '#ffffff',
                                position: 'absolute',
                                left: '5px'
                            }}></div>
                            <div style={{
                                width: '20px',
                                height: '15px',
                                backgroundColor: '#ffffff',
                                position: 'absolute',
                                top: '5px'
                            }}></div>
                            <div style={{
                                width: '8px',
                                height: '8px',
                                backgroundColor: '#2563eb',
                                position: 'absolute',
                                top: '10px',
                                left: '6px',
                                animation: 'eyesMovement 2s infinite'
                            }}></div>
                        </div>
                    </div>

                    <style>{`
                        @keyframes ghostUpDown {
                            0%, 100% {
                                transform: scale(${scale}) translateY(0px);
                            }
                            50% {
                                transform: scale(${scale}) translateY(-8px);
                            }
                        }

                        @keyframes flicker0 {
                            0%, 49% { opacity: 1; }
                            50%, 100% { opacity: 0; }
                        }

                        @keyframes flicker1 {
                            0%, 49% { opacity: 0; }
                            50%, 100% { opacity: 1; }
                        }

                        @keyframes eyesMovement {
                            0%, 49% { transform: translateX(0px); }
                            50%, 99% { transform: translateX(3px); }
                            100% { transform: translateX(0px); }
                        }
                    `}</style>
                </div>
            );
        };

        return (
            <>
                <canvas
                    ref={canvasRef}
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        maxWidth: 'calc(100% - 8px)',
                        maxHeight: 'calc(100% - 8px)',
                        pointerEvents: 'none',
                        borderRadius: '4px',
                        display: isMobileRef.current ? 'none' : 'block'
                    }}
                />

                {isMobileRef.current && <PacmanGhost />}
            </>
        );
    };

    const checkPasswordRequirements = (password) => {
        return {
            requirements: {
                length: password.length >= 5,
                uppercase: /[A-Z]/.test(password),
                lowercase: /[a-z]/.test(password),
                digit: /\d/.test(password),
                special: /[\W_]/.test(password),
            },
            allValid: (
                password.length >= 5 &&
                /[A-Z]/.test(password) &&
                /[a-z]/.test(password) &&
                /\d/.test(password) &&
                /[\W_]/.test(password)
            )
        };
    };

    const validateEmailOrUsername = (value) => {
        const trimmedValue = value.trim();

        if (trimmedValue === "") {
            return false;
        }

        if (trimmedValue.includes('@')) {
            return emailRegex.test(trimmedValue);
        }

        return usernameRegex.test(trimmedValue);
    };

    const updatePasswordCounter = (password, counterRef) => {
        const counter = counterRef.current;
        if (!counter) return;

        const { requirements } = checkPasswordRequirements(password);

        counter.style.display = 'block';
        counter.style.opacity = '1';
        counter.style.transform = 'translateY(0)';

        const spans = counter.querySelectorAll('.counter-item');
        if (spans.length >= 5) {
            const charCount = password.length;
            const uppercaseCount = (password.match(/[A-Z]/g) || []).length;
            const lowercaseCount = (password.match(/[a-z]/g) || []).length;
            const digitCount = (password.match(/\d/g) || []).length;
            const specialCount = (password.match(/[\W_]/g) || []).length;

            spans[0].textContent = `Char: ${charCount}`;
            spans[1].textContent = `Upper: ${uppercaseCount}`;
            spans[2].textContent = `Lower: ${lowercaseCount}`;
            spans[3].textContent = `Digit: ${digitCount}`;
            spans[4].textContent = `Special: ${specialCount}`;

            spans[0].className = `counter-item ${requirements.length ? 'valid' : 'invalid'}`;
            spans[1].className = `counter-item ${requirements.uppercase ? 'valid' : 'invalid'}`;
            spans[2].className = `counter-item ${requirements.lowercase ? 'valid' : 'invalid'}`;
            spans[3].className = `counter-item ${requirements.digit ? 'valid' : 'invalid'}`;
            spans[4].className = `counter-item ${requirements.special ? 'valid' : 'invalid'}`;
        }

        if (password.length === 0) {
            hidePasswordCounter(counterRef);
        } else {
            counter.classList.add('custom-pulse-subtle');
            setTimeout(() => counter.classList.remove('custom-pulse-subtle'), 600);
        }
    };

    const togglePasswordCounter = (counterRef, isAllValid) => {
        const counter = counterRef.current;
        if (!counter) return;

        if (isAllValid) {
            hidePasswordCounter(counterRef);
        } else {
            counter.style.display = 'block';
            setTimeout(() => {
                counter.style.opacity = '1';
                counter.style.transform = 'translateY(0)';
            }, 10);
        }
    };

    const hidePasswordCounter = (counterRef) => {
        const counter = counterRef.current;
        if (!counter) return;

        counter.style.opacity = '0';
        counter.style.transform = 'translateY(-10px)';
        setTimeout(() => counter.style.display = 'none', 300);
    };

    const resetPasswordCounter = (counterRef) => {
        const counter = counterRef.current;
        if (!counter) return;

        counter.style.display = 'block';
        counter.style.opacity = '1';
        counter.style.transform = 'translateY(0)';

        const spans = counter.querySelectorAll('.counter-item');
        if (spans.length >= 5) {
            spans[0].textContent = 'Char: 0';
            spans[1].textContent = 'Upper: 0';
            spans[2].textContent = 'Lower: 0';
            spans[3].textContent = 'Digit: 0';
            spans[4].textContent = 'Special: 0';

            spans.forEach(span => span.className = 'counter-item');
        }
    };

    const initializeCounterStyles = () => {
        const counter = countRef.current;
        if (counter) {
            counter.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            counter.style.opacity = '0';
            counter.style.transform = 'translateY(-10px)';
            counter.style.display = 'none';
        }
    };

    const validateInput = (event) => {
        const target = event.target;

        const isEmailValid = validateEmailOrUsername(emailRef.current.value);
        if (target === emailRef.current) {
            emailRuleRef.current.style.color = isEmailValid ? "green" : "#ff3c00";
            emailRuleRef.current.classList.remove("animate__animated", "animate__headShake");
            void emailRuleRef.current.offsetWidth;
            emailRuleRef.current.classList.add("animate__animated", isEmailValid ? "custom-pulse" : "animate__headShake");
        }

        const isPasswordValid = passwordRegex.test(passwordRef.current.value.trim());
        if (target === passwordRef.current) {
            pwdRuleRef.current.style.color = isPasswordValid ? "green" : "#ff3c00";
            pwdRuleRef.current.classList.remove("animate__animated", "animate__headShake");
            void pwdRuleRef.current.offsetWidth;
            pwdRuleRef.current.classList.add("animate__animated", isPasswordValid ? "custom-pulse" : "animate__headShake");
        }

        const newAllRight = isEmailValid && isPasswordValid;
        setAllRight(newAllRight);

        updateButtonStyles(newAllRight);
    };

    const validateData = (data) =>{
        if(!data.email || !data.password || data.rememberme === undefined){
            showErrorMessage('Invalid data');
            return false;
        }

        if(!emailRegex.test(data.email)){
            showErrorMessage('Invalid email format');
            return false;
        }

        if (!passwordRegex.test(data.password)) {
            showErrorMessage('Invalid password format');
            return false;
        }

        if(typeof data.rememberme !== 'boolean'){
            showErrorMessage('Invalid rememberme format');
            return false;
        }

        return true;
    }

    const updateButtonStyles = (isValid) => {
        if (loginButtonRef.current && status !== 'loading') {
            loginButtonRef.current.disabled = !isValid;
            loginButtonRef.current.classList.toggle("enabled", isValid);
            loginButtonRef.current.style.backgroundColor = isValid ? "#2563eb" : "#ff3c00";
            loginButtonRef.current.style.cursor = isValid ? "pointer" : "not-allowed";
        }
    };

    const login = async () => {
        try {
            const data = {
                email: emailRef.current.value,
                password: passwordRef.current.value,
                rememberme: rememberMeRef.current.checked,
            };

            if(!validateData(data)){
                return;
            }

            setStatus('loading');

            const response = await fetch(`${API_BASE_URL}/api/users/signIn`, {
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
            login();
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
        if (e.target === passwordRef.current) {
            resetPasswordCounter(countRef);
        }
        validateInput(e);
    };

    const togglePasswordVisibility = () => {
        setPasswordVisible(!passwordVisible);
    };

    const handlePasswordFocus = (counterRef) => {
        togglePasswordCounter(counterRef, false);
    };

    const handlePasswordBlur = (counterRef) => {
        hidePasswordCounter(counterRef);
    };

    const handlePasswordKeyUp = (e, counterRef) => {
        updatePasswordCounter(e.target.value, counterRef);
    };

    const handleGoogleLogin = (e) => {
        e.preventDefault();

        googleButtonRef.current.disabled = true;
        googleButtonRef.current.innerHTML = `
            <div class="loading-spinner"></div>
            Connecting...
        `;

        window.location.href = `${API_BASE_URL}/api/connect/google`;
    };

    const handleAuthCallback = () => {
        const currentPath = window.location.pathname;
        const urlParams = new URLSearchParams(window.location.search);

        if (currentPath.includes('/auth/success')) {
            const type = urlParams.get('type');
            const message = urlParams.get('message');

            if (type && message) {
                showSuccessMessage(message);
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 2000);
            }
        }

        if (currentPath.includes('/auth/error')) {
            const message = urlParams.get('message');

            if (message) {
                showErrorMessage(message);
                setTimeout(() => {
                    window.location.href = '/login';
                }, 3000);
            }
        }
    };

    const showSuccessMessage = (message) => {
        const notyf = new Notyf();
        notyf.success({
            message: message,
            duration: 2000,
            dismissible: true,
            position: { x: 'right', y: 'top' },
        });
    };

    const showErrorMessage = (message) => {
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
                            <b>Email or Username</b>: Valid email format or username (5-20 characters, lowercase letters and numbers only)
                        </p>
                        <p id="pwd_rule" ref={pwdRuleRef}>
                            <b>Password</b>: At least 5 characters, one uppercase letter, one lowercase letter, one digit, one special character
                        </p>
                    </div>
                    <button className="tts-btn" id="speakRulesBtn" ref={speakBtnRef}>
                        <span className="material-symbols-outlined">volume_up</span>
                    </button>
                </div>
            </fieldset>
            <br />
            <fieldset id="logIn">
                <form id="logInForm" ref={formRef} onSubmit={handleSubmit}>
                    <div id="content1">
                        <label htmlFor="login_email">Email or Username</label>
                        <input
                            type="text"
                            id="login_email"
                            placeholder="email@gmail.com/es or username"
                            required
                            minLength="9"
                            maxLength="255"
                            autoComplete="emailorusername"
                            ref={emailRef}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            onInput={validateInput}
                            onDoubleClick={handleDblClick}
                        />

                        <label htmlFor="login_password">Password</label>
                        <div className="input-container">
                            <input
                                type={passwordVisible ? "text" : "password"}
                                id="login_password"
                                placeholder="Password (At least 5 characters)"
                                required
                                minLength="5"
                                maxLength="255"
                                autoComplete="current-password"
                                ref={passwordRef}
                                onFocus={(e) => {
                                    handleFocus(e);
                                    handlePasswordFocus(countRef);
                                }}
                                onBlur={(e) => {
                                    handleBlur(e);
                                    handlePasswordBlur(countRef);
                                }}
                                onInput={validateInput}
                                onKeyUp={(e) => handlePasswordKeyUp(e, countRef)}
                                onDoubleClick={handleDblClick}
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={togglePasswordVisibility}
                            >
                                <span className="material-symbols-outlined">
                                    {passwordVisible ? "visibility" : "visibility_off"}
                                </span>
                            </button>
                        </div>
                        <div id="count" className="password-counter" ref={countRef}>
                            <span className="counter-item">Char: 0</span>
                            <span className="counter-item">Upper: 0</span>
                            <span className="counter-item">Lower: 0</span>
                            <span className="counter-item">Digit: 0</span>
                            <span className="counter-item">Special: 0</span>
                        </div>

                        <div className="options-container">
                            <div className="checkbox-container">
                                <input
                                    type="checkbox"
                                    id="rememberme"
                                    name="rememberMe"
                                    ref={rememberMeRef}
                                />
                                <label htmlFor="rememberme" className="cbx"></label>
                                <label htmlFor="rememberme">Remember Me</label>
                            </div>
                            <a
                                href="/checkEmail?type=changePassword"
                                className="forgot-password"
                                id="forgotPasswordLink"
                            >
                                Forgot Password?
                            </a>
                        </div>
                    </div>
                    <div id="content2">
                        <a
                            href="/signIn"
                            className="button"
                            style={{ backgroundColor: "#2563eb" }}
                        >
                            Sign In
                        </a>
                        <button
                            type="submit"
                            className={`
                                login-btn 
                                ${allRight ? 'enabled' : ''} 
                                ${isSuccess ? 'btn-success' : ''} 
                                ${isError ? 'btn-error' : ''}
                                ${isLoading ? 'loading' : ''}
                            `}
                            disabled={!allRight || isLoading}
                            id="inicio"
                            ref={loginButtonRef}
                            style={{
                                cursor: (!allRight || isLoading) ? 'not-allowed' : 'pointer',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            {isLoading ? <DVDAnimation /> : "Login"}
                        </button>
                    </div>
                    <div className="google-login">
                        <button
                            type="button"
                            id="googleButton"
                            ref={googleButtonRef}
                            onClick={handleGoogleLogin}
                        >
                            <img
                                src="/img/google-icon.svg"
                                alt="Google icon"
                            />
                            Log in with Google
                        </button>
                    </div>
                </form>
            </fieldset>
        </>
    );
}