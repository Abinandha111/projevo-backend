import DashboardLayout from "../components/DashboardLayout";
import { useEffect, useState } from "react";
import API from "../services/api";

function AI() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSavedTasks = async (projectId) => {
    try {
      const token = localStorage.getItem("token");

      const res = await API.get("/projects/", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const project = res.data.find(
        (item) => item.id === Number(projectId)
      );

      if (project && project.ai_tasks) {
        const taskData = JSON.parse(project.ai_tasks);
        setTasks(taskData.epics);
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.log(err);
    }
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

      if (res.data.length > 0) {
        const savedProjectId = localStorage.getItem("selectedProject");

        console.log("Saved Project ID:", savedProjectId);

        const selected = res.data.find(
          (project) => project.id === Number(savedProjectId)
        );

        console.log("Selected Project:", selected);

        if (selected) {
          setSelectedProject(selected.id);
          fetchSavedTasks(selected.id);
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const generateTasks = async () => {
    if (!selectedProject) {
      alert("Please select a project first");
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      const res = await API.post(
        `/ai/generate-tasks?project_id=${selectedProject}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const taskData = JSON.parse(
        res.data.saved_tasks.join("")
      );

      setTasks(taskData.epics);

      localStorage.setItem(
        "selectedProject",
        selectedProject
      );
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <h1>AI Assistant</h1>

      <select
        value={selectedProject}
        onChange={(e) => {
          const projectId = e.target.value;

          setSelectedProject(projectId);

          localStorage.setItem(
            "selectedProject",
            projectId
          );

          if (projectId) {
            fetchSavedTasks(projectId);
          } else {
            setTasks([]);
          }
        }}
      >
        <option value="">Select a project</option>

        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.title}
          </option>
        ))}
      </select>

      <button
        onClick={generateTasks}
        disabled={loading}
      >
        {loading
          ? "Generating... ⏳"
          : "Generate Tasks 🤖"}
      </button>

      <div>
        {tasks.length === 0 ? (
          <p>No tasks generated yet 🤖</p>
        ) : (
          tasks.map((epic, index) => (
            <div key={index}>
              <h2>{epic.name}</h2>

              {epic.tasks.map((task, taskIndex) => (
                <p key={taskIndex}>
                  {taskIndex + 1}. {task}
                </p>
              ))}
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}

export default AI;