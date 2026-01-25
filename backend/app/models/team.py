"""
Team Management Models
Defines roles, permissions, and team member management for content creation
"""

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum

class RoleEnum(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    CONTENT_MANAGER = "content_manager"
    SCRIPT_WRITER = "script_writer"
    VOICE_ARTIST = "voice_artist"
    ANIMATOR = "animator"
    MOTION_GRAPHICS = "motion_graphics"
    REVIEWER = "reviewer"

class PermissionEnum(str, enum.Enum):
    # Character permissions
    CREATE_CHARACTER = "CREATE_CHARACTER"
    EDIT_CHARACTER = "EDIT_CHARACTER"
    DELETE_CHARACTER = "DELETE_CHARACTER"
    APPROVE_CHARACTER = "APPROVE_CHARACTER"
    
    # Content permissions
    CREATE_SCRIPT = "CREATE_SCRIPT"
    EDIT_SCRIPT = "EDIT_SCRIPT"
    APPROVE_SCRIPT = "APPROVE_SCRIPT"
    
    UPLOAD_VOICE = "UPLOAD_VOICE"
    EDIT_VOICE = "EDIT_VOICE"
    APPROVE_VOICE = "APPROVE_VOICE"
    
    UPLOAD_ANIMATION = "UPLOAD_ANIMATION"
    EDIT_ANIMATION = "EDIT_ANIMATION"
    APPROVE_ANIMATION = "APPROVE_ANIMATION"
    
    UPLOAD_MOTION_GRAPHICS = "UPLOAD_MOTION_GRAPHICS"
    EDIT_MOTION_GRAPHICS = "EDIT_MOTION_GRAPHICS"
    APPROVE_MOTION_GRAPHICS = "APPROVE_MOTION_GRAPHICS"
    
    # Team management
    MANAGE_TEAM = "MANAGE_TEAM"
    ASSIGN_TASKS = "ASSIGN_TASKS"
    VIEW_ANALYTICS = "VIEW_ANALYTICS"
    
    # System permissions
    SYSTEM_CONFIG = "SYSTEM_CONFIG"
    USER_MANAGEMENT = "USER_MANAGEMENT"

class Role(Base):
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    display_name = Column(String(100), nullable=False)
    description = Column(Text)
    permissions = Column(JSON, default=list)
    is_system_role = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    team_members = relationship("TeamMember", back_populates="role")

class TeamMember(Base):
    __tablename__ = "team_members"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False, index=True)
    department = Column(String(100), nullable=False)
    specialization = Column(String(200))
    bio = Column(Text)
    avatar_url = Column(String(500))
    is_active = Column(Boolean, default=True)
    hire_date = Column(DateTime(timezone=True))
    last_login = Column(DateTime(timezone=True))
    
    # Performance metrics
    tasks_completed = Column(Integer, default=0)
    average_rating = Column(Integer, default=0)  # 1-5 scale
    total_projects = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="team_member")
    role = relationship("Role", back_populates="team_members")
    assigned_tasks = relationship("Task", back_populates="assigned_to")
    created_tasks = relationship("Task", back_populates="created_by")

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    task_type = Column(String(50), nullable=False)  # script, voice, animation, motion_graphics
    status = Column(String(50), default="pending")  # pending, in_progress, review, completed, rejected
    priority = Column(String(20), default="medium")  # low, medium, high, urgent
    
    # Relationships
    character_id = Column(Integer, ForeignKey("islamic_characters.id"))
    assigned_to_id = Column(Integer, ForeignKey("team_members.id"))
    created_by_id = Column(Integer, ForeignKey("team_members.id"))
    reviewer_id = Column(Integer, ForeignKey("team_members.id"))
    
    # Content references
    script_id = Column(String(100))  # Reference to script file
    voice_id = Column(String(100))    # Reference to voice file
    animation_id = Column(String(100)) # Reference to animation file
    motion_graphics_id = Column(String(100)) # Reference to motion graphics file
    
    # Metadata
    due_date = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    estimated_hours = Column(Integer)
    actual_hours = Column(Integer)
    notes = Column(Text)
    attachments = Column(JSON, default=list)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    character = relationship("IslamicCharacter")
    assigned_to = relationship("TeamMember", foreign_keys=[assigned_to_id], back_populates="assigned_tasks")
    created_by = relationship("TeamMember", foreign_keys=[created_by_id], back_populates="created_tasks")
    reviewer = relationship("TeamMember", foreign_keys=[reviewer_id])

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    status = Column(String(50), default="planning")  # planning, in_progress, review, completed
    priority = Column(String(20), default="medium")
    
    # Timeline
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    estimated_completion = Column(DateTime(timezone=True))
    
    # Team
    project_manager_id = Column(Integer, ForeignKey("team_members.id"))
    team_members = Column(JSON, default=list)  # Array of team member IDs
    
    # Progress tracking
    total_tasks = Column(Integer, default=0)
    completed_tasks = Column(Integer, default=0)
    budget = Column(Integer)
    actual_cost = Column(Integer)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    project_manager = relationship("TeamMember")
    tasks = relationship("Task", back_populates="project")

class ContentApproval(Base):
    __tablename__ = "content_approvals"
    
    id = Column(Integer, primary_key=True, index=True)
    content_type = Column(String(50), nullable=False)  # script, voice, animation, motion_graphics
    content_id = Column(String(100), nullable=False)
    status = Column(String(50), default="pending")  # pending, approved, rejected, needs_revision
    
    # Approval workflow
    submitted_by_id = Column(Integer, ForeignKey("team_members.id"))
    reviewed_by_id = Column(Integer, ForeignKey("team_members.id"))
    current_stage = Column(String(50), default="script_review")  # script_review, voice_review, animation_review, final_approval
    
    # Feedback
    feedback = Column(Text)
    revision_notes = Column(Text)
    approval_notes = Column(Text)
    
    # Metadata
    submission_date = Column(DateTime(timezone=True), server_default=func.now())
    review_date = Column(DateTime(timezone=True))
    final_approval_date = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    submitted_by = relationship("TeamMember", foreign_keys=[submitted_by_id])
    reviewed_by = relationship("TeamMember", foreign_keys=[reviewed_by_id])
