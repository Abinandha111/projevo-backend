import DashboardLayout from "../components/DashboardLayout";
import { useEffect, useState } from "react";
import API from "../services/api";
import "../styles/Tasks.css";

function Tasks() {

  const [tasks, setTasks] = useState([]);
  const [projectName, setProjectName] = useState("");

  const selectedProject = localStorage.getItem("selectedProject");

  const updateStatus = async (taskId, status) => {
    try {
      const token = localStorage.getItem("token");

      await API.put(
        `/tasks/${taskId}`,
        { status: status },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId
            ? { ...task, status: status }
            : task
        )
      );

      console.log("Status updated:", status);

    } catch (err) {
      console.log(err);
    }
  };

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem("token");

      const projectRes = await API.get("/projects/", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const taskRes = await API.get(
        `/tasks/${selectedProject}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log("Tasks from database:", taskRes.data.tasks);

      setTasks(taskRes.data.tasks);

      const project = projectRes.data.find(
        (item) => item.id === Number(selectedProject)
      );

      if (project) {
        setProjectName(project.title);
      }

    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Group tasks by epic
  const groupedTasks = {};

  tasks.forEach((task) => {

    const parts = task.title.split("] ");

    const epicName = parts[0].replace("[", "");

    if (!groupedTasks[epicName]) {
      groupedTasks[epicName] = [];
    }

    groupedTasks[epicName].push(task);

  });

  return (
    <DashboardLayout>

      <h1>Tasks</h1>

      <p className="project-name">
        Project: {projectName}
      </p>

      {tasks.length === 0 ? (
        <p>No Tasks generated yet</p>
      ) : (

        Object.entries(groupedTasks).map(
          ([epicName, epicTasks]) => (

            <div
              className="epic-card"
              key={epicName}
            >

              <h2 className="epic-title">
                {epicName}
              </h2>

              {epicTasks.map((task) => {

                

                const taskTitle = task.title.split("] ")[1];

                return (
                  <div
                    className="task-item"
                    key={task.id}
                  >

                    <p>
                      {taskTitle}
                    </p>

                    <select
                      key={`${task.id}-${task.status}`}
                      value={task.status}
                      onChange={(e) =>
                        updateStatus(
                          task.id,
                          e.target.value
                        )
                      }
                    >

                      <option value="pending">
                        Pending
                      </option>

                      <option value="in_progress">
                        In Progress
                      </option>

                      <option value="completed">
                        Completed
                      </option>

                    </select>

                  </div>
                );

              })}

            </div>

          )
        )

      )}

    </DashboardLayout>
  );
}

export default Tasks;