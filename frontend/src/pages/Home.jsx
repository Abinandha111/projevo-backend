import Navbar from "../components/Navbar";
import "../styles/Home.css";

function Home() {
  return (
    <>
      <Navbar />

      <div className="home-container">

        <div className="hero-section">

          <h1 className="hero-title">
            Manage Projects Smarter with AI
          </h1>

          <p className="hero-text">
            NexTask helps teams organize projects, manage tasks,
            and use AI-powered suggestions to improve productivity.
          </p>

          <div className="hero-buttons">
            <button className="btn">
              Get Started
            </button>

            
          </div>

        </div>

        <div className="features-section">

            <h2>Features</h2>

        <div className="feature-cards">

        <div className="card">
            <h3>AI Task Suggestions</h3>
            <p>
                 Get smart task recommendations using AI.
            </p>
        </div>

        <div className="card">
            <h3>Project Management</h3>
            <p>
                Create and manage projects easily.
            </p>
        </div>

        <div className="card">
            <h3>Task Tracking</h3>
            <p>
                Track progress and deadlines efficiently.
            </p>
        </div>

        <div className="card">
            <h3>Smart Dashboard</h3>
            <p>
            View project insights and statistics.
            </p>
        </div>

    </div>

    </div>

    <div className="about-section">

  <h2><h2>About NexTask</h2></h2>

  <p>
    NexTask is an AI-powered project management platform
    designed to help individuals and teams organize projects,
    manage tasks, and improve productivity with smart AI features.
  </p>

</div>

<footer className="footer">

  <h3>NexTask</h3>

  <p>
    AI Powered Project Management Platform
  </p>

  <p>
    © 2026 NexTask. All Rights Reserved.
  </p>

</footer>

      </div>
    </>
  );
}

export default Home;