import { useState } from "react";
import "../styles/Login.css";
import { Link } from "react-router-dom";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

function Register() {

  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });


    const handleRegister = async () => {

  if (form.password !== form.confirmPassword) {
    alert("Passwords do not match!");
    return;
  }

  try {
    await API.post("/auth/register", {
      name: form.name,
      email: form.email,
      password: form.password
    });

    alert("Registration successful 🚀");

    // go to login page
    navigate("/login");

  } catch (err) {
    alert("Registration failed ❌");
  }
};
  

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  

    

  return (
    <div className="login-container">

      <div className="login-box">

        <h1>Register</h1>

        <input
          name="name"
          placeholder="username"
          onChange={handleChange}
          autoComplete="name"
        />

        <input
          name="email"
          type="email"
          placeholder="email"
          onChange={handleChange}
          autoComplete="email"
        />

        <input
          name="password"
          type="password"
          placeholder="password"
          onChange={handleChange}
          autoComplete="new-password"
        />

        <input
          name="confirmPassword"
          type="password"
          placeholder="Confirm password"
          onChange={handleChange}
          autoComplete="new-password"
        />

        <button onClick={handleRegister}>
          Register
        </button>

        <p>
          Already have an account?{" "}
          <Link to="/login">Login</Link>
        </p>

      </div>

    </div>
  );
}

export default Register;