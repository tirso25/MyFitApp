import { useEffect, useRef, useState } from "react";
import { useNavigate } from 'react-router-dom';
import confetti from "canvas-confetti";
import { Notyf } from "notyf";
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

    useTTS(speakBtnRef, rulesContainerRef);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const checkCodeParam = params.get("checkCode");
        if (checkCodeParam && checkCodeRef.current) {
            checkCodeRef.current.value = checkCodeParam;
            validateInput({ target: checkCodeRef.current });
        }
    }, []);

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

        if (sendCodeButtonRef.current) {
            sendCodeButtonRef.current.disabled = !newAllRight;
            sendCodeButtonRef.current.classList.toggle("enabled", newAllRight);
            sendCodeButtonRef.current.style.backgroundColor = newAllRight ? "#2563eb" : "#ff3c00";
            sendCodeButtonRef.current.style.cursor = newAllRight ? "pointer" : "not-allowed";
        }

        if (newAllRight) {
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
            setAlreadyCelebrated(false);
        }
    };

    const checkCodee = () => {
        sendCodeButtonRef.current.classList.remove('bounce-animation');

        const data = {
            verificationCode: checkCodeRef.current.value
        };

        fetch(`${API_BASE_URL}/api/users/checkCode`, {
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
                <form id="checkCodeForm" ref={formRef}>
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
                    </div>
                    <div id="content2">
                        <button
                            type="submit"
                            style={{ backgroundColor: "#ff5900", cursor: "not-allowed" }}
                            id="send_code"
                            disabled
                            ref={sendCodeButtonRef}
                            onClick={handleSubmit}
                        >
                            Check
                        </button>
                    </div>
                </form>
            </fieldset>
        </>
    );
}