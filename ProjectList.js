
// ProjectList.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProjectService } from "../../../../../services/companies/projectService";
import { getEmployees } from "../../../../../services/companies/employee";
import Sidebar from "../../../ClientCompanies/sidebar";
import ClientCompaniesAfterLoginTopbar from "../../../ClientCompanies/ClientCompaniesAfterLoginTopbar";
import Footer from "../../../ClientCompanies/footerCompanies";
import {
  Alert,
  Button,
  Checkbox,
  ColumnLayout,
  Form,
  FormField,
  Input,
  Select,
  SpaceBetween,
  Textarea,
} from "@cloudscape-design/components";
import "./styles.css";
import { FiEdit3, FiClock } from "react-icons/fi";
import { getAuth } from "firebase/auth";

const roleMapping = {
  "Web Development": [
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "UI/UX Designer",
  ],
  "Mobile App": [
    "iOS Developer",
    "Android Developer",
    "Mobile UI Designer",
    "QA Tester",
  ],
  "Data Analysis": [
    "Data Analyst",
    "Data Engineer",
    "Business Analyst",
    "Data Scientist",
  ],
  "Research & Development": [
    "Research Scientist",
    "Lab Technician",
    "Project Coordinator",
    "Technical Writer",
  ],
  "Marketing Campaign": [
    "Marketing Manager",
    "Content Writer",
    "SEO Specialist",
    "Social Media Manager",
  ],
};

function ProjectList({ companyID, isAdmin, usrEmail }) {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const projectsPerPage = 6;

  const auth = getAuth();
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectType, setProjectType] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTeamMembers, setSelectedTeamMembers] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateAlert, setUpdateAlert] = useState(null);
  const [validation, setValidation] = useState({
    projectTitle: "",
    projectType: "",
    startDate: "",
    endDate: "",
    teamMembers: "",
  });

  const projectTypes = Object.keys(roleMapping).map((type) => ({
    label: type,
    value: type,
  }));

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!usrEmail) throw new Error("Please log in to view projects");
        const projectData = await ProjectService.fetchProjects(companyID, usrEmail, isAdmin);
        setProjects(projectData || []);
        const employeeData = await getEmployees(companyID);
        setEmployees(employeeData.employees || []);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setAlert({
          type: "error",
          header: "Fetch Failed",
          content: error.message || "Unable to load project or employee list.",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [companyID, usrEmail, isAdmin]);

  useEffect(() => {
    if (selectedProject) {
      setProjectTitle(selectedProject.title || "");
      setProjectType({
        label: selectedProject.type || "",
        value: selectedProject.type || "",
      });
      setStartDate(selectedProject.startDate || "");
      setEndDate(selectedProject.endDate || "");
      setDescription(selectedProject.description || "");
      setSelectedTeamMembers(
        selectedProject.teamLeads
          ?.filter((lead) => lead && lead.email) // Filter out invalid leads
          .map((lead) => ({
            email: lead.email,
            role: lead.role || "Unassigned",
            photoUrl:
              employees.find((emp) => emp.email === lead.email)?.photoUrl ||
              "/default-profile.png",
          })) || []
      );
    }
  }, [selectedProject, employees]);

  useEffect(() => {
    if (projectType?.value) {
      setSelectedTeamMembers((prev) =>
        prev.map((member) => ({
          ...member,
          role: roleMapping[projectType.value]?.includes(member.role)
            ? member.role
            : "Unassigned",
        }))
      );
    }
  }, [projectType]);

  const handleTeamMemberChange = (employeeEmail) => {
    setSelectedTeamMembers((prev) => {
      const exists = prev.find((m) => m.email === employeeEmail);
      if (exists) {
        return prev.filter((m) => m.email !== employeeEmail);
      }
      return [
        ...prev,
        {
          email: employeeEmail,
          role: "Unassigned",
          photoUrl:
            employees.find((e) => e.email === employeeEmail)?.photoUrl ||
            "/default-profile.png",
        },
      ];
    });
    setValidation((prev) => ({ ...prev, teamMembers: "" }));
  };

  const handleRoleChange = (email, newRole) => {
    setSelectedTeamMembers((prev) =>
      prev.map((member) =>
        member.email === email ? { ...member, role: newRole } : member
      )
    );
  };

  const openUpdatePopup = (project) => {
    if (!isAdmin && project.createdBy !== usrEmail) {
      setAlert({
        type: "error",
        header: "Permission Denied",
        content: "You can only edit projects you created.",
      });
      return;
    }
    setSelectedProject(project);
    setIsPopupOpen(true);
  };

  const closeUpdatePopup = () => {
    setIsPopupOpen(false);
    setSelectedProject(null);
    setProjectTitle("");
    setProjectType(null);
    setStartDate("");
    setEndDate("");
    setDescription("");
    setSelectedTeamMembers([]);
    setUpdateAlert(null);
    setValidation({
      projectTitle: "",
      projectType: "",
      startDate: "",
      endDate: "",
      teamMembers: "",
    });
  };

  const handleUpdateProject = async () => {
    let valid = true;
    const errors = {
      projectTitle: "",
      projectType: "",
      startDate: "",
      endDate: "",
      teamMembers: "",
    };

    if (!projectTitle.trim()) {
      errors.projectTitle = "Project title is required.";
      valid = false;
    }
    if (!projectType?.value) {
      errors.projectType = "Project type is required.";
      valid = false;
    }
    if (!startDate) {
      errors.startDate = "Start date is required.";
      valid = false;
    }
    if (!endDate) {
      errors.endDate = "End date is required.";
      valid = false;
    }
    if (selectedTeamMembers.length === 0) {
      errors.teamMembers = "At least one team member is required.";
      valid = false;
    }

    setValidation(errors);
    if (!valid) return;

    setIsUpdating(true);
    setUpdateAlert(null);

    try {
      const updatedProject = {
        id: selectedProject.id,
        title: projectTitle,
        type: projectType.value,
        startDate,
        endDate,
        description,
        teamLeads: selectedTeamMembers.map((member) => ({
          email: member.email,
          role: member.role,
        })),
      };

      await ProjectService.updateProject(companyID, selectedProject.id, updatedProject);
      setProjects((prevProjects) =>
        prevProjects.map((proj) =>
          proj.id === updatedProject.id
            ? { ...proj, ...updatedProject }
            : proj
        )
      );

      setUpdateAlert({
        type: "success",
        header: "Project updated!",
        content: `Project "${projectTitle.slice(0, 30)}${projectTitle.length > 30 ? "..." : ""}" has been updated successfully.`,
      });

      setTimeout(() => closeUpdatePopup(), 1500);
    } catch (error) {
      console.error("Failed to update project:", error);
      setUpdateAlert({
        type: "error",
        header: "Update Failed",
        content: "Something went wrong while updating the project.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const totalPages = Math.ceil(projects.length / projectsPerPage);
  const indexOfLastProject = currentPage * projectsPerPage;
  const indexOfFirstProject = indexOfLastProject - projectsPerPage;
  const currentProjects = projects.slice(indexOfFirstProject, indexOfLastProject);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className="page-container">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpen={() => setIsSidebarOpen(true)}
      />
      <div
        className="content-wrapper"
        style={{ marginLeft: isSidebarOpen ? "250px" : "40px" }}
      >
        
        <div className="project-list-header">
          <h3>Projects</h3>
          <Button
            className="btn-create"
            onClick={() => navigate("/project/create")}
          >
            Create
          </Button>
        </div>

        {alert && (
          <Alert
            type={alert.type}
            header={alert.header}
            dismissible
            onDismiss={() => setAlert(null)}
          >
            {alert.content}
          </Alert>
        )}

        {loading ? (
          <p className="loading-message">Loading projects...</p>
        ) : projects.length === 0 ? (
          <p className="no-projects">No projects available.</p>
        ) : (
          <>
            <div className="project-grid">
              {currentProjects.map((project) => (
                <div
                  key={project.id}
                  className="project-card"
                  style={{ cursor: "pointer", position: "relative" }}
                >
                  <div
                    className="update-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      openUpdatePopup(project);
                    }}
                    title="Update Project"
                  >
                    <FiEdit3 size={16} />
                  </div>
                  <div
                    onClick={() =>
                      navigate(`/project/${project.id}`, {
                        state: { companyID },
                      })
                    }
                  >
                    <div className="card-header">
                      <h3 className="card-title">
                        {project.title || "Untitled Project"}
                      </h3>
                    </div>
                    <hr className="card-divider" />
                    <p className="card-description">
                      {project.description || "No description available."}
                    </p>
                    <div className="card-date">
                      <FiClock
                        className="clock-icon"
                        size={14}
                        style={{ marginRight: "4px" }}
                      />
                      {project.startDate
                        ? new Date(project.startDate).toLocaleDateString()
                        : "No date"}
                    </div>
                    <div className="card-footer">
                      <div className="card-footer-content">
                        <div className="avatar-group">
                          {project.teamLeads && project.teamLeads.length > 0 ? (
                            project.teamLeads
                              .filter((lead) => lead && typeof lead.email === "string") // Filter invalid leads
                              .slice(0, 3)
                              .map((lead) => {
                                const employee = employees.find(
                                  (emp) => emp.email === lead.email
                                );
                                if (!lead.email) {
                                  console.warn(
                                    `Invalid team lead in project ${project.id}:`,
                                    lead
                                  );
                                  return null;
                                }
                                return (
                                  <span key={lead.email} className="avatar">
                                    {employee ? (
                                      <img
                                        src={
                                          employee.photoUrl || "/default-profile.png"
                                        }
                                        alt={employee.name || "Team member"}
                                        className="profile-image"
                                        onError={(e) => {
                                          e.target.src = "/default-profile.png";
                                        }}
                                      />
                                    ) : (
                                      <span className="avatar-initial">
                                        {lead.email.charAt(0).toUpperCase()}
                                      </span>
                                    )}
                                  </span>
                                );
                              })
                              .filter(Boolean) // Remove null entries
                          ) : (
                            <span className="no-team">No team assigned</span>
                          )}
                        </div>
                        <div className="issues">
                          <span className="issue-icon">📋</span>
                          <span>
                            {project.tasks?.length || 0} tasks
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-button"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, index) => (
                <button
                  key={index + 1}
                  onClick={() => handlePageChange(index + 1)}
                  className={`pagination-button ${
                    currentPage === index + 1 ? "active" : ""
                  }`}
                >
                  {index + 1}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination-button"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

      {isPopupOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "900px",
              width: "100%",
              minHeight: "400px",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <span role="img" aria-label="Form icon">
                  📋
                </span>
                <h2
                  style={{
                    fontSize: "20px",
                    fontWeight: "600",
                    color: "#1e293b",
                    margin: 0,
                  }}
                >
                  Update Project
                </h2>
              </div>
              <Button
                variant="icon"
                iconName="close"
                onClick={closeUpdatePopup}
                style={{ color: "#dc2626" }}
              />
            </div>

            <Form
              actions={
                <SpaceBetween direction="horizontal" size="xs">
                  <Button
                    variant="primary"
                    onClick={handleUpdateProject}
                    loading={isUpdating}
                    disabled={isUpdating}
                  >
                    Update Project
                  </Button>
                  <Button
                    variant="normal"
                    onClick={closeUpdatePopup}
                    disabled={isUpdating}
                  >
                    Cancel
                  </Button>
                </SpaceBetween>
              }
            >
              <SpaceBetween size="l">
                {updateAlert && (
                  <Alert type={updateAlert.type} header={updateAlert.header}>
                    {updateAlert.content}
                  </Alert>
                )}

                <ColumnLayout columns={4}>
                  <FormField
                    label="Project Title"
                    errorText={validation.projectTitle}
                    constraintText="Required"
                  >
                    <Input
                      value={projectTitle}
                      onChange={({ detail }) => setProjectTitle(detail.value)}
                      placeholder="Enter project title"
                    />
                  </FormField>

                  <FormField
                    label="Project Type"
                    errorText={validation.projectType}
                    constraintText="Required"
                  >
                    <Select
                      selectedOption={projectType}
                      onChange={({ detail }) =>
                        setProjectType(detail.selectedOption)
                      }
                      options={[
                        { label: "-- Select a project type --", value: "" },
                        ...projectTypes,
                      ]}
                      placeholder="Select a project type"
                    />
                  </FormField>

                  <FormField
                    label="Start Date"
                    errorText={validation.startDate}
                    constraintText="Required"
                  >
                    <Input
                      type="date"
                      value={startDate}
                      onChange={({ detail }) => setStartDate(detail.value)}
                    />
                  </FormField>

                  <FormField
                    label="End Date"
                    errorText={validation.endDate}
                    constraintText="Required"
                  >
                    <Input
                      type="date"
                      value={endDate}
                      onChange={({ detail }) => setEndDate(detail.value)}
                    />
                  </FormField>
                </ColumnLayout>

                <FormField
                  label="Team Members"
                  errorText={validation.teamMembers}
                  constraintText="At least one team member is required"
                >
                  <SpaceBetween size="m">
                    <div
                      style={{
                        background:
                          "linear-gradient(135deg, #f5f7fa 0%, #e4e8ed 100%)",
                        borderRadius: "10px",
                        padding: "20px",
                        border: "1px solid #cbd5e1",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: "700",
                          fontSize: "16px",
                          color: "#1e293b",
                          marginBottom: "16px",
                          textShadow: "0 1px 1px rgba(0,0,0,0.05)",
                        }}
                      >
                        Selected Team Members
                      </div>
                      {selectedTeamMembers.length > 0 ? (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2, 1fr)",
                            gap: "16px",
                          }}
                        >
                          {selectedTeamMembers.map((member) => (
                            <div
                              key={member.email}
                              style={{
                                maxWidth: "280px",
                                background: "#ffffff",
                                borderRadius: "8px",
                                padding: "12px",
                                border: "1px solid #e2e8f0",
                                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <img
                                src={member.photoUrl || "/default-profile.png"}
                                alt={
                                  employees.find(
                                    (emp) => emp.email === member.email
                                  )?.name || "Team member"
                                }
                                style={{
                                  width: "36px",
                                  height: "36px",
                                  borderRadius: "6px",
                                  border: "1px solid #cbd5e1",
                                  objectFit: "cover",
                                }}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    fontWeight: "600",
                                    fontSize: "14px",
                                    color: "#1e293b",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {employees.find(
                                    (emp) => emp.email === member.email
                                  )?.name || member.email}
                                </div>
                                <Select
                                  selectedOption={{
                                    label: member.role,
                                    value: member.role,
                                  }}
                                  onChange={({ detail }) =>
                                    handleRoleChange(
                                      member.email,
                                      detail.selectedOption.value
                                    )
                                  }
                                  options={[
                                    {
                                      label: projectType?.value
                                        ? "Select Role"
                                        : "Select Project Type First",
                                      value: "Unassigned",
                                    },
                                    ...(projectType?.value
                                      ? roleMapping[projectType.value].map(
                                          (role) => ({
                                            label: role,
                                            value: role,
                                          })
                                        )
                                      : []),
                                  ]}
                                  disabled={!projectType?.value}
                                />
                              </div>
                              <Button
                                variant="icon"
                                iconName="close"
                                onClick={() =>
                                  handleTeamMemberChange(member.email)
                                }
                                style={{ color: "#dc2626" }}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div
                          style={{
                            color: "#64748b",
                            fontStyle: "italic",
                            fontSize: "14px",
                          }}
                        >
                          No team members selected
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        maxHeight: "250px",
                        overflowY: "auto",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        backgroundColor: "#fff",
                        padding: "10px",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: "700",
                          color: "#1e293b",
                          marginBottom: "10px",
                        }}
                      >
                        Available Employees
                      </div>
                      <SpaceBetween size="xs">
                        {employees.map((employee, index) => (
                          <div
                            key={employee.email}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "8px",
                              backgroundColor:
                                index % 2 === 0 ? "#fafafa" : "#fff",
                              borderRadius: "4px",
                            }}
                          >
                            <Checkbox
                              checked={selectedTeamMembers.some(
                                (m) => m.email === employee.email
                              )}
                              onChange={() =>
                                handleTeamMemberChange(employee.email)
                              }
                            />
                            <img
                              src={employee.photoUrl || "/default-profile.png"}
                              alt={employee.name}
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "4px",
                                border: "1px solid #d1d5db",
                              }}
                            />
                            <div style={{ flex: 1 }}>
                              <div
                                style={{ fontWeight: "600", color: "#1e293b" }}
                              >
                                {employee.name}
                              </div>
                              <div
                                style={{ color: "#64748b", fontSize: "12px" }}
                              >
                                {employee.designation || "N/A"}
                              </div>
                            </div>
                          </div>
                        ))}
                      </SpaceBetween>
                    </div>
                  </SpaceBetween>
                </FormField>
              </SpaceBetween>
            </Form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default ProjectList;
