import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CheckEmail from './components/CheckEmail.jsx';
import ChangePassword from "./components/ChangePassword.jsx";
import Login from './components/Login.jsx';
import SignIn from './components/SignIn.jsx';
import CheckCode from './components/CheckCode.jsx';
import Index from './components/Index.jsx';
import '../index.css';

function App() {
    return (
        <Router>
            <main>
                <Routes>
                    <Route path="/checkEmail" element={<CheckEmail />} />
                    <Route path="/changePassword" element={<ChangePassword />} />
                    <Route path="/signIn" element={<SignIn />} />
                    <Route path="/checkCode" element={<CheckCode />} />
                    <Route path="/login" element={<Login />} />
                    <Route path={"/index"} element={<Index />} />
                    <Route path="/" element={<Navigate to="/login" replace />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </main>
        </Router>
    );
}

export default App;