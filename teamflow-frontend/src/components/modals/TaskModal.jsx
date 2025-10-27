import React, { useState, useEffect, useContext } from "react";
import Select from "react-select";
import { AuthContext } from "../../context/AuthContext";
import { toast } from "react-hot-toast";
import CommentSection from "../CommentSection";
import WorkLogSection from "../WorkLogSection";
import "./TaskModal.css";

import {
  fetchTaskComments,
  postTaskComment,
  fetchTaskWorkLogs,
  postTaskWorkLog,
  toggleTaskPermission
} from "../../api/taskExtras";

export default function TaskModal({
  onClose,
  onSave,
  editing,
  column,
  projects,
  users,
  viewOnly = false, // view-only mode
}) {
  const { user } = useContext(AuthContext);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [memberIds, setMemberIds] = useState([]);
  const [priority, setPriority] = useState("low");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState(column);
  const [allowMemberEdit, setAllowMemberEdit] = useState(false);
  
  const [comments, setComments] = useState([]);
  const [workLogs, setWorkLogs] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [workLogsLoading, setWorkLogsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("comments"); // Default to comments

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isMember = user?.role === 'member';

  //  Determine if form fields should be editable
  const canEditFields = !viewOnly && (isAdmin || (isMember && allowMemberEdit));
  const canEditAssignments = !viewOnly && isAdmin;

  // Sync form with editing task
  useEffect(() => {
    if (editing) {
      setTitle(editing.title || "");
      setDescription(editing.description || "");
      setProjectId(editing.project_id || "");
      setAllowMemberEdit(editing.allow_member_edit || false);

      if (editing.member_ids && Array.isArray(editing.member_ids)) {
        setMemberIds(editing.member_ids);
      } else if (editing.member_id) {
        setMemberIds([editing.member_id]);
      } else {
        setMemberIds([]);
      }

      setPriority(editing.priority || "low");
      setDueDate(editing.due_date ? editing.due_date.split('T')[0] : "");
      setStatus(editing.status || column);
    } else {
      setTitle("");
      setDescription("");
      setProjectId("");
      setMemberIds([]);
      setPriority("low");
      setDueDate("");
      setStatus(column);
      setAllowMemberEdit(false);
    }
  }, [editing, column]);

  // Load comments and work logs when task ID changes
  useEffect(() => {
    if (editing?.id) {
      loadTaskData();
    }
  }, [editing?.id]);

  const loadTaskData = async () => {
    try {
      setCommentsLoading(true);
      const commentsResult = await fetchTaskComments(editing.id);
      if (commentsResult.ok) {
        setComments(commentsResult.data);
      } else {
        toast.error(commentsResult.error || "Failed to load comments");
      }
      setCommentsLoading(false);

      setWorkLogsLoading(true);
      const workLogsResult = await fetchTaskWorkLogs(editing.id);
      if (workLogsResult.ok) {
        setWorkLogs(workLogsResult.data);
      } else {
        toast.error(workLogsResult.error || "Failed to load work logs");
      }
      setWorkLogsLoading(false);
    } catch (error) {
      console.error("Error loading task data:", error);
      toast.error("Failed to load task data");
      setCommentsLoading(false);
      setWorkLogsLoading(false);
    }
  };

  const handleAddComment = async (commentText) => {
    if (!commentText.trim()) return;
    try {
      const result = await postTaskComment(
        editing.id, 
        commentText, 
        localStorage.getItem("token"), 
        parseInt(localStorage.getItem("organizationId"))
      );
      if (result.ok) {
        setComments(prev => [...prev, result.data]);
        toast.success("Comment added successfully");
      } else {
        toast.error(result.error || "Failed to add comment");
      }
    } catch (error) {
      toast.error("Failed to add comment");
    }
  };

  const handleAddWorkLog = async (logData) => {
  try {
    const result = await postTaskWorkLog(editing.id, logData);

      if (result.ok) {
        setWorkLogs(prev => [...prev, result.data]);
        toast.success("Work log added successfully");
      } else {
        toast.error(result.error || "Failed to add work log");
      }
    } catch (error) {
      toast.error("Failed to add work log");
    }
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !projectId || memberIds.length === 0) {
      toast.error("Please fill all required fields");
      return;
    }

    //  Validate due_date format (ISO 8601)
    let formattedDueDate = null;
    if (dueDate) {
      try {
        formattedDueDate = new Date(dueDate).toISOString();
      } catch (err) {
        toast.error("Invalid date format");
        return;
      }
    }

    const payload = {
      id: editing?.id,          // ← NEW – preserves the id for updates
      title,
      description,
      project_id: parseInt(projectId),
      member_ids: memberIds,
      priority,
      due_date: formattedDueDate,
      status,
      allow_member_edit: allowMemberEdit
    };

    try {
      await onSave(payload);
      onClose();
    } catch (error) {
      console.error("Error saving task:", error);
      toast.error(error.message || "Task operation failed");
    }
  };

  const currentUserOrgId = localStorage.getItem("organizationId");
  const orgUsers = users.filter(user => 
    user.organization_id === parseInt(currentUserOrgId) && 
    user.role === "member"
  );

  const formattedUsers = orgUsers.map((user) => ({
    value: user.id,
    label: `${user.full_name || user.email.split('@')[0]} (${user.email})`,
  }));

  const handleMemberChange = (selectedOptions) => {
    const ids = selectedOptions ? selectedOptions.map((opt) => opt.value) : [];
    setMemberIds(ids);
  };

  return (
    <div className="task-modal-overlay" onClick={onClose}>
      <div className="task-modal-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="task-modal-header">
          <h2 className="task-modal-title">
            {viewOnly 
              ? `View Task - ${editing?.title || 'New Task'}` 
              : editing 
                ? "Edit Task" 
                : "Create New Task"
            }
          </h2>
          <button className="task-modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="task-modal-body">
          <form onSubmit={handleSubmit} className="task-modal-form">
            
            {/* Task Details Section */}
            <section className="task-details-section">
              <h3 className="section-title">Task Details</h3>
              <div className="task-details-grid">
                
                {/* Left Column */}
                <div className="form-column">
                  <div className="form-group">
                    <label className="form-label">Task Title *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={title}
                      onChange={(e) => canEditFields && setTitle(e.target.value)}
                      required
                      disabled={!canEditFields}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-textarea"
                      value={description}
                      onChange={(e) => canEditFields && setDescription(e.target.value)}
                      rows="4"
                      disabled={!canEditFields}
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="form-column">
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={dueDate}
                      onChange={(e) => canEditFields && setDueDate(e.target.value)}
                      disabled={!canEditFields}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Assign to Member(s) *</label>
                    <Select
                      isMulti
                      options={formattedUsers}
                      value={formattedUsers.filter(user => memberIds.includes(user.value))}
                      onChange={canEditAssignments ? handleMemberChange : undefined}
                      placeholder="Select members..."
                      required
                      isDisabled={!canEditAssignments}
                      className="react-select-container"
                      classNamePrefix="react-select"
                    />
                  </div>


                </div>
              </div>
              
              {/* Dropdowns in one row */}
              <div className="form-row dropdowns-row">
                <div className="form-group">
                  <label className="form-label">Select Project *</label>
                  <select
                    className="form-select"
                    value={projectId}
                    onChange={(e) => canEditFields && setProjectId(e.target.value)}
                    required
                    disabled={!canEditFields}
                  >
                    <option value="">-- Select Project --</option>
                    {projects
                      .filter(project => project.organization_id === parseInt(currentUserOrgId))
                      .map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-select"
                    value={priority}
                    onChange={(e) => canEditFields && setPriority(e.target.value)}
                    disabled={!canEditFields}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Status *</label>
                  <select
                    className="form-select"
                    value={status}
                    onChange={(e) => !viewOnly && setStatus(e.target.value)}
                    required
                    disabled={viewOnly}
                  >
                    <option value="Open">Open</option>
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="In QA">In QA</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Tabs for Work Logs and Comments */}
            <div className="tabs-container">
              <div className="tabs-header">
                <button
                  type="button"
                  className={`tab-button ${activeTab === 'comments' ? 'active' : ''}`}
                  onClick={() => setActiveTab('comments')}
                >
                  Comments
                </button>
                <button
                  type="button"
                  className={`tab-button ${activeTab === 'worklogs' ? 'active' : ''}`}
                  onClick={() => setActiveTab('worklogs')}
                >
                  Work Logs
                </button>
              </div>


              <div className="tab-content">
                {activeTab === 'comments' && (
                  <section className="comments-section">
                    <CommentSection
                      comments={comments}
                      onAddComment={handleAddComment}
                      user={user}
                      isLoading={commentsLoading}
                      disabled={viewOnly}
                    />
                  </section>
                )}
                
                {activeTab === 'worklogs' && (
                <section className="worklog-section">
                  <WorkLogSection
                    workLogs={workLogs}
                    onAddWorkLog={handleAddWorkLog}
                    user={user}
                    isLoading={workLogsLoading}
                    disabled={viewOnly}
                    showInput={true} //  ensures WorkLogSection displays input (like CommentSection)
                  />
                </section>
              )}

              </div>
            </div>

          </form>
        </div>

        {/* Footer - Action Buttons */}
        <div className="task-modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            {viewOnly ? "Close" : "Cancel"}
          </button>
          {!viewOnly && (
            <button
              type="submit"
              className="btn btn-primary"
              onClick={handleSubmit}
            >
              {editing ? "Update Task" : "Create Task"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

