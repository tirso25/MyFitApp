import { useEffect, useRef, useState } from "react";
import { useNavigate } from 'react-router-dom';
import confetti from "canvas-confetti";
import { Notyf } from "notyf";
import useTTS from "../hooks/useTTS.js";
import "notyf/notyf.min.css";
import 'animate.css';
import "../styles/general.css";
import "../styles/signIn.css";

const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{5,255}$/;
const codeRegex = /^[0-9]{6}$/;
const navigate = useNavigate();
const API_BASE_URL = 'https://myfitapp.onrender.com';

export default function ChangePassword() {
    const formRef = useRef(null);
    const checkCodeRef = useRef(null);
    const passwordRef = useRef(null);
    const repeatPasswordRef = useRef(null);
    const changePasswordButtonRef = useRef(null);
    const speakBtnRef = useRef(null);
    const rulesContainerRef = useRef(null);

    const codeRuleRef = useRef(null);
    const pwdRuleRef = useRef(null);
    const repeatPwdRuleRef = useRef(null);

    const countRef = useRef(null);
    const count2Ref = useRef(null);

    const [passwordVisible, setPasswordVisible] = useState(false);
    const [repeatPasswordVisible, setRepeatPasswordVisible] = useState(false);
    const [allRight, setAllRight] = useState(false);
    const [alreadyCelebrated, setAlreadyCelebrated] = useState(false);

    useTTS(speakBtnRef, rulesContainerRef);

    useEffect(() => {
        initializeCounterStyles();

        const params = new URLSearchParams(window.location.search);
        const checkCode = params.get("checkCode");
        if (checkCode && checkCodeRef.current) {
            checkCodeRef.current.value = checkCode;
            validateInput({ target: checkCodeRef.current });
        }
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
        [countRef, count2Ref].forEach(ref => {
            const counter = ref.current;
            if (counter) {
                counter.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                counter.style.opacity = '0';
                counter.style.transform = 'translateY(-10px)';
                counter.style.display = 'none';
            }
        });
    };

    const validateInput = (event) => {
        const target = event.target;

        const isCodeValid = checkCodeRef.current.value.trim() !== "" && codeRegex.test(checkCodeRef.current.value.trim());
        if (target === checkCodeRef.current) {
            codeRuleRef.current.style.color = isCodeValid ? "green" : "#ff3c00";
            codeRuleRef.current.classList.remove("animate__animated", "animate__headShake");
            void codeRuleRef.current.offsetWidth;
            codeRuleRef.current.classList.add("animate__animated", isCodeValid ? "custom-pulse" : "animate__headShake");
        }

        const isPasswordValid = passwordRegex.test(passwordRef.current.value.trim());
        if (target === passwordRef.current) {
            pwdRuleRef.current.style.color = isPasswordValid ? "green" : "#ff3c00";
            pwdRuleRef.current.classList.remove("animate__animated", "animate__headShake");
            void pwdRuleRef.current.offsetWidth;
            pwdRuleRef.current.classList.add("animate__animated", isPasswordValid ? "custom-pulse" : "animate__headShake");
        }

        const isRepeatPasswordValid = passwordRegex.test(repeatPasswordRef.current.value.trim()) &&
            repeatPasswordRef.current.value.trim() === passwordRef.current.value.trim();
        if (target === repeatPasswordRef.current) {
            repeatPwdRuleRef.current.style.color = isRepeatPasswordValid ? "green" : "#ff3c00";
            repeatPwdRuleRef.current.classList.remove("animate__animated", "animate__headShake");
            void repeatPwdRuleRef.current.offsetWidth;
            repeatPwdRuleRef.current.classList.add("animate__animated", isRepeatPasswordValid ? "custom-pulse" : "animate__headShake");
        }

        const newAllRight = isCodeValid && isPasswordValid && isRepeatPasswordValid;
        setAllRight(newAllRight);

        if (changePasswordButtonRef.current) {
            changePasswordButtonRef.current.disabled = !newAllRight;
            changePasswordButtonRef.current.classList.toggle("enabled", newAllRight);
            changePasswordButtonRef.current.style.backgroundColor = newAllRight ? "#2563eb" : "#ff3c00";
            changePasswordButtonRef.current.style.cursor = newAllRight ? "pointer" : "not-allowed";
        }

        if (newAllRight) {
            changePasswordButtonRef.current.classList.add('bounce-animation');
            if (!alreadyCelebrated) {
                setAlreadyCelebrated(true);
                const rect = changePasswordButtonRef.current.getBoundingClientRect();
                const x = (rect.left + rect.right) / 2 / window.innerWidth;
                const y = (rect.top + rect.bottom) / 2 / window.innerHeight;
                confetti({ particleCount: 150, spread: 70, origin: { x, y } });
            }
        } else {
            changePasswordButtonRef.current.classList.remove('bounce-animation');
            setAlreadyCelebrated(false);
        }
    };

    const changePassword = () => {
        changePasswordButtonRef.current.classList.remove('bounce-animation');

        const data = {
            verificationCode: checkCodeRef.current.value,
            password: passwordRef.current.value,
            repeatPassword: repeatPasswordRef.current.value,
        };

        fetch(`${API_BASE_URL}/api/users/changePassword`, {
            method: "PUT",
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
            changePasswordButtonRef.current.classList.remove('bounce-animation');
            formRef.current.classList.add('shake');
            setTimeout(() => formRef.current.classList.remove('shake'), 400);
        } else {
            changePassword();
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
        } else if (e.target === repeatPasswordRef.current) {
            resetPasswordCounter(count2Ref);
        }
        validateInput(e);
    };

    const togglePasswordVisibility = (field) => {
        if (field === 'password') {
            setPasswordVisible(!passwordVisible);
        } else {
            setRepeatPasswordVisible(!repeatPasswordVisible);
        }
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

    return (
        <>
            <fieldset>
                <div className="rules-container" ref={rulesContainerRef}>
                    <div id="rules">
                        <p id="code_rule" ref={codeRuleRef}>
                            <b>Code</b>: 6 numbers
                        </p>
                        <p id="pwd_rule" ref={pwdRuleRef}>
                            <b>Password</b>: At least 5 characters, one uppercase letter, one lowercase letter, one digit, one special character
                        </p>
                        <p id="repeatpwd_rule" ref={repeatPwdRuleRef}>
                            <b>Repeat password</b>: The same that the first password
                        </p>
                    </div>
                    <button className="tts-btn" id="speakRulesBtn" ref={speakBtnRef}>
                        <span className="material-symbols-outlined">volume_up</span>
                    </button>
                </div>
            </fieldset>
            <br />
            <fieldset id="signIn">
                <form id="changePasswordForm" ref={formRef} onSubmit={handleSubmit}>
                    <div id="content1">
                        <label htmlFor="check_code">Code</label>
                        <input
                            type="text"
                            id="check_code"
                            placeholder="123456"
                            required
                            ref={checkCodeRef}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            onInput={validateInput}
                            onDoubleClick={handleDblClick}
                        />

                        <label htmlFor="signIn_password">Password</label>
                        <div className="input-container">
                            <input
                                type={passwordVisible ? "text" : "password"}
                                id="signIn_password"
                                name="password"
                                placeholder="Password (At least 5 characters)"
                                required
                                minLength="5"
                                maxLength="30"
                                title="At least 5 characters, including uppercase, lowercase, number, and special character"
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
                                onClick={() => togglePasswordVisibility('password')}
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

                        <label htmlFor="signIn_repeat_password">Repeat password</label>
                        <div className="input-container">
                            <input
                                type={repeatPasswordVisible ? "text" : "password"}
                                id="signIn_repeat_password"
                                name="repeat_password"
                                placeholder="Password (At least 5 characters)"
                                required
                                minLength="5"
                                maxLength="30"
                                title="At least 5 characters, including uppercase, lowercase, number, and special character"
                                ref={repeatPasswordRef}
                                onFocus={(e) => {
                                    handleFocus(e);
                                    handlePasswordFocus(count2Ref);
                                }}
                                onBlur={(e) => {
                                    handleBlur(e);
                                    handlePasswordBlur(count2Ref);
                                }}
                                onInput={validateInput}
                                onKeyUp={(e) => handlePasswordKeyUp(e, count2Ref)}
                                onDoubleClick={handleDblClick}
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => togglePasswordVisibility('repeat')}
                            >
                                <span className="material-symbols-outlined">
                                    {repeatPasswordVisible ? "visibility" : "visibility_off"}
                                </span>
                            </button>
                        </div>
                        <div id="count2" className="password-counter" ref={count2Ref}>
                            <span className="counter-item">Char: 0</span>
                            <span className="counter-item">Upper: 0</span>
                            <span className="counter-item">Lower: 0</span>
                            <span className="counter-item">Digit: 0</span>
                            <span className="counter-item">Special: 0</span>
                        </div>
                    </div>
                    <div id="content2">
                        <button
                            type="submit"
                            style={{ backgroundColor: "#ff5900", cursor: "not-allowed" }}
                            id="change_password"
                            disabled
                            ref={changePasswordButtonRef}
                        >
                            Change
                        </button>
                    </div>
                </form>
            </fieldset>
        </>
    );
}