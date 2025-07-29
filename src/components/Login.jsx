import { useEffect, useRef, useState } from "react";
import { useNavigate } from 'react-router-dom';
import confetti from "canvas-confetti";
import { Notyf } from "notyf";
import useTTS from "../hooks/useTTS.js";
import "notyf/notyf.min.css";
import 'animate.css';
import "../styles/general.css";
import "../styles/login.css";

const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|[a-zA-Z0-9.-]+\.es)$/;
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

    useTTS(speakBtnRef, rulesContainerRef);

    useEffect(() => {
        initializeCounterStyles();
        handleAuthCallback();
    }, []);

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

        if (loginButtonRef.current) {
            loginButtonRef.current.disabled = !newAllRight;
            loginButtonRef.current.classList.toggle("enabled", newAllRight);
            loginButtonRef.current.style.backgroundColor = newAllRight ? "#2563eb" : "#ff3c00";
            loginButtonRef.current.style.cursor = newAllRight ? "pointer" : "not-allowed";
        }

        if (newAllRight) {
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
            setAlreadyCelebrated(false);
        }
    };

    const login = () => {
        loginButtonRef.current.classList.remove('bounce-animation');

        const data = {
            email: emailRef.current.value,
            password: passwordRef.current.value,
            rememberme: rememberMeRef.current.checked,
        };

        fetch(`${API_BASE_URL}/api/users/signIn`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        })
            .then(response => {
                if (!response.ok) {
                    formRef.current.classList.add('shake');
                    setTimeout(() => formRef.current.classList.remove('shake'), 400);

                    return response.json().then(message => {
                        const notyf = new Notyf();
                        notyf.error({
                            message: message.message,
                            duration: 4000,
                            dismissible: true,
                            position: { x: 'right', y: 'top' },
                        });
                    });
                }

                confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
                return response.json();
            })
            .then((message) => {
                const notyf = new Notyf();
                notyf.success({
                    message: message.message,
                    duration: 2000,
                    dismissible: true,
                    position: { x: 'right', y: 'top' },
                });
            })
            .catch(error => {
                console.error("Error:", error);
            });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!allRight) {
            setAlreadyCelebrated(false);
            loginButtonRef.current.classList.remove('bounce-animation');
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
                                href="https://myfitappp.vercel.app/sendEmail.html?type=changePassword"
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
                            style={{ backgroundColor: "#ff5900", cursor: "not-allowed" }}
                            id="inicio"
                            disabled
                            ref={loginButtonRef}
                        >
                            Login
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
                            Sign in with Google
                        </button>
                    </div>
                </form>
            </fieldset>
        </>
    );
}