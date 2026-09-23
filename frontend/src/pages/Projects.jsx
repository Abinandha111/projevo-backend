import DashboardLayout from "../components/DashboardLayout";
import { useEffect, useState } from "react";
import API from "../services/api";

function Projects() {

  const [showForm, setShowForm] = useState(false);

  const [project, setProject] = useState({
    title: "",
    description: "",
    deadline: ""
  });

  const [projects, setProjects] = useState([]);

  const handleChange = (e) => {
    setProject({
      ...project,
      [e.target.name]: e.target.value
    });
  };

  const fetchProjects = async () => {
    try {

      const token = localStorage.getItem("token");

      const res = await API.get("/projects/", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setProjects(res.data);

    } catch (err) {
      console.log(err);
    }
  };

  const handleAddProject = async () => {
    try {

      const token = localStorage.getItem("token");

      console.log(project);

      await API.post(
        "/projects/",
        project,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      fetchProjects();

      alert("Project created 🚀");

      setProject({
        title: "",
        description: "",
        deadline: ""
      });

      setShowForm(false);

    } catch (err) {
      alert("Failed to create project ❌");
      console.log(err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <DashboardLayout>

      <h1>Projects</h1>

      <button onClick={() => setShowForm(!showForm)}>
        Create Project
      </button>

      {showForm && (

        <div>

          <input
            name="title"
            placeholder="Project Name"
            onChange={handleChange}
          />

          <textarea
            name="description"
            placeholder="Project Description"
            onChange={handleChange}
          />

          <input
            type="date"
            name="deadline"
            onChange={handleChange}
          />

          <button onClick={handleAddProject}>
            Add
          </button>

        </div>

      )}

      <div>

        {projects.length === 0 ? (

          <h3>No projects yet</h3>

        ) : (

          projects.map((item) => (
            <div key={item.id}>

              <h3>{item.title}</h3>

              <p>{item.description}</p>

              <p>Deadline: {item.deadline}</p>

            </div>
          ))

        )}

      </div>

    </DashboardLayout>
  );
}

export default Projects;