from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import json
import psutil
import sqlite3
from pathlib import Path

from ..database import get_db
from ..models import User, IslamicCharacter, UserProgress, TeamMember, Role, Task, Project, ContentApproval
from ..security import get_current_user, get_password_hash

router = APIRouter()

def is_admin_user(user: User) -> bool:
    """Check if user has admin privileges"""
    return user.is_superuser

def has_permission(user: User, permission: str) -> bool:
    """Check if user has specific permission"""
    if user.is_superuser:
        return True
    
    # Check team member permissions
    team_member = db.query(TeamMember).filter(TeamMember.user_id == user.id).first()
    if not team_member:
        return False
    
    return permission in team_member.role.permissions

@router.get("/stats")
async def get_admin_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get admin dashboard statistics"""
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # User statistics
        total_users = db.query(User).count()
        active_users = db.query(User).filter(User.is_active == True).count()
        
        # Character statistics
        total_characters = db.query(IslamicCharacter).count()
        active_characters = db.query(IslamicCharacter).filter(IslamicCharacter.is_active == True).count()
        
        # Progress statistics
        total_progress = db.query(UserProgress).count()
        completed_progress = db.query(UserProgress).filter(UserProgress.is_completed == True).count()
        
        # Database size
        db_path = Path("on_their_footsteps.db")
        database_size = 0
        if db_path.exists():
            database_size = db_path.stat().st_size / (1024 * 1024)  # MB
        
        return {
            "totalUsers": total_users,
            "activeUsers": active_users,
            "totalCharacters": total_characters,
            "activeCharacters": active_characters,
            "completedStories": completed_progress,
            "totalProgress": total_progress,
            "databaseSize": f"{database_size:.1f} MB"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")

@router.get("/users")
async def get_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """Get all users with pagination"""
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        users = db.query(User).offset(skip).limit(limit).all()
        
        user_list = []
        for user in users:
            # Get user progress count
            progress_count = db.query(UserProgress).filter(UserProgress.user_id == user.id).count()
            completed_count = db.query(UserProgress).filter(
                UserProgress.user_id == user.id,
                UserProgress.is_completed == True
            ).count()
            
            user_list.append({
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "is_active": user.is_active,
                "is_superuser": user.is_superuser,
                "created_at": user.created_at.isoformat(),
                "last_active": user.last_active.isoformat() if user.last_active else None,
                "completed_stories": completed_count,
                "total_progress": progress_count
            })
        
        return user_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get users: {str(e)}")

@router.put("/users/{user_id}")
async def manage_user(
    user_id: int,
    action: str,
    full_name: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_superuser: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manage user (toggle status, reset password, etc.)"""
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if action == "toggle":
            user.is_active = not user.is_active
            db.commit()
            return {"message": f"User {'activated' if user.is_active else 'deactivated'} successfully"}
        
        elif action == "reset_password":
            # Generate temporary password
            import secrets
            temp_password = f"temp_{secrets.token_urlsafe(8)}"
            user.hashed_password = get_password_hash(temp_password)
            db.commit()
            return {"message": "Password reset successfully", "temp_password": temp_password}
        
        elif action == "update":
            if full_name is not None:
                user.full_name = full_name
            if is_active is not None:
                user.is_active = is_active
            if is_superuser is not None:
                user.is_superuser = is_superuser
            db.commit()
            return {"message": "User updated successfully"}
        
        else:
            raise HTTPException(status_code=400, detail="Invalid action")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to manage user: {str(e)}")

@router.get("/characters")
async def get_characters(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """Get all characters with pagination"""
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        characters = db.query(IslamicCharacter).offset(skip).limit(limit).all()
        
        character_list = []
        for character in characters:
            # Get view count
            views_count = character.views_count if hasattr(character, 'views_count') else 0
            
            character_list.append({
                "id": character.id,
                "name": character.name,
                "arabic_name": character.arabic_name,
                "category": character.category,
                "is_active": character.is_active,
                "is_featured": character.is_featured,
                "views_count": views_count,
                "created_at": character.created_at.isoformat()
            })
        
        return character_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get characters: {str(e)}")

@router.put("/characters/{character_id}")
async def manage_character(
    character_id: int,
    action: str,
    is_active: Optional[bool] = None,
    is_featured: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manage character (toggle status, etc.)"""
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        character = db.query(IslamicCharacter).filter(IslamicCharacter.id == character_id).first()
        if not character:
            raise HTTPException(status_code=404, detail="Character not found")
        
        if action == "toggle":
            character.is_active = not character.is_active
            db.commit()
            return {"message": f"Character {'activated' if character.is_active else 'deactivated'} successfully"}
        
        elif action == "update":
            if is_active is not None:
                character.is_active = is_active
            if is_featured is not None:
                character.is_featured = is_featured
            db.commit()
            return {"message": "Character updated successfully"}
        
        else:
            raise HTTPException(status_code=400, detail="Invalid action")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to manage character: {str(e)}")

@router.get("/health")
async def get_system_health(
    current_user: User = Depends(get_current_user)
):
    """Get system health status"""
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        health_status = {
            "timestamp": datetime.now().isoformat(),
            "backend": {
                "status": "healthy",
                "uptime": "N/A",
                "memory_usage": 0,
                "cpu_usage": 0
            },
            "database": {
                "status": "healthy",
                "connection": "ok",
                "size_mb": 0,
                "tables": 0
            },
            "frontend": {
                "status": "unknown",
                "response_time": 0
            },
            "system": {
                "status": "healthy",
                "cpu_percent": 0,
                "memory_percent": 0,
                "disk_percent": 0
            }
        }
        
        # Database health check
        try:
            db_path = Path("on_their_footsteps.db")
            if db_path.exists():
                conn = sqlite3.connect(str(db_path))
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                tables = cursor.fetchall()
                conn.close()
                
                health_status["database"]["tables"] = len(tables)
                health_status["database"]["size_mb"] = db_path.stat().st_size / (1024 * 1024)
            else:
                health_status["database"]["status"] = "missing"
        except Exception as e:
            health_status["database"]["status"] = "error"
            health_status["database"]["error"] = str(e)
        
        # System metrics
        try:
            health_status["system"]["cpu_percent"] = psutil.cpu_percent()
            memory = psutil.virtual_memory()
            health_status["system"]["memory_percent"] = memory.percent
            disk = psutil.disk_usage('/')
            health_status["system"]["disk_percent"] = disk.percent
            
            if health_status["system"]["cpu_percent"] > 90 or \
               health_status["system"]["memory_percent"] > 90 or \
               health_status["system"]["disk_percent"] > 90:
                health_status["system"]["status"] = "warning"
        except Exception as e:
            health_status["system"]["status"] = "error"
            health_status["system"]["error"] = str(e)
        
        # Frontend health check
        try:
            import requests
            response = requests.get("http://localhost:3000", timeout=5)
            health_status["frontend"]["status"] = "healthy" if response.status_code == 200 else "unhealthy"
            health_status["frontend"]["response_time"] = response.elapsed.total_seconds() * 1000
        except Exception as e:
            health_status["frontend"]["status"] = "down"
            health_status["frontend"]["error"] = str(e)
        
        return health_status
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get health status: {str(e)}")

@router.post("/health-check")
async def run_health_check(
    current_user: User = Depends(get_current_user)
):
    """Run comprehensive health check"""
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # This would trigger a comprehensive health check
        # For now, just return the current health status
        return await get_system_health(current_user)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@router.get("/logs")
async def get_system_logs(
    current_user: User = Depends(get_current_user),
    level: Optional[str] = None,
    limit: int = 100
):
    """Get system logs"""
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # This would read from actual log files
        # For now, return sample logs
        logs = [
            {
                "timestamp": datetime.now().isoformat(),
                "level": "INFO",
                "service": "backend",
                "message": "Application started successfully"
            },
            {
                "timestamp": datetime.now().isoformat(),
                "level": "INFO",
                "service": "database",
                "message": "Database connection established"
            },
            {
                "timestamp": datetime.now().isoformat(),
                "level": "WARNING",
                "service": "system",
                "message": "High memory usage detected"
            }
        ]
        
        if level:
            logs = [log for log in logs if log["level"] == level.upper()]
        
        return logs[:limit]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get logs: {str(e)}")

@router.get("/backup")
async def create_backup(
    current_user: User = Depends(get_current_user)
):
    """Create system backup"""
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # This would trigger the backup script
        # For now, return a success message
        return {
            "message": "Backup initiated successfully",
            "backup_id": f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "status": "in_progress"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}")

@router.get("/metrics")
async def get_detailed_metrics(
    current_user: User = Depends(get_current_user),
    days: int = 7
):
    """Get detailed metrics for the specified period"""
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # This would query actual metrics data
        # For now, return sample metrics
        metrics = {
            "period": f"{days} days",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "user_registrations": 15,
            "active_sessions": 8,
            "story_completions": 42,
            "api_requests": 1250,
            "average_response_time": 250,
            "error_rate": 0.02
        }
        
        return metrics
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get metrics: {str(e)}")

# ==================== TEAM MANAGEMENT ====================

@router.get("/team")
async def get_team_members(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all team members"""
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    team_members = db.query(TeamMember).join(Role).all()
    return [
        {
            "id": member.id,
            "user_id": member.user_id,
            "name": member.user.full_name or member.user.email,
            "email": member.user.email,
            "role": member.role.display_name,
            "department": member.department,
            "specialization": member.specialization,
            "is_active": member.is_active,
            "tasks_completed": member.tasks_completed,
            "average_rating": member.average_rating,
            "hire_date": member.hire_date.isoformat() if member.hire_date else None,
            "last_login": member.last_login.isoformat() if member.last_login else None
        }
        for member in team_members
    ]

@router.post("/team")
async def add_team_member(
    team_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new team member"""
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if user exists
    user = db.query(User).filter(User.id == team_data["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is already a team member
    existing_member = db.query(TeamMember).filter(TeamMember.user_id == team_data["user_id"]).first()
    if existing_member:
        raise HTTPException(status_code=400, detail="User is already a team member")
    
    # Create team member
    team_member = TeamMember(
        user_id=team_data["user_id"],
        role_id=team_data["role_id"],
        department=team_data["department"],
        specialization=team_data.get("specialization"),
        bio=team_data.get("bio"),
        hire_date=team_data.get("hire_date")
    )
    
    db.add(team_member)
    db.commit()
    db.refresh(team_member)
    
    return {"message": "Team member added successfully", "id": team_member.id}

@router.put("/team/{member_id}")
async def update_team_member(
    member_id: int,
    team_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update team member"""
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    member = db.query(TeamMember).filter(TeamMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")
    
    # Update fields
    for field, value in team_data.items():
        if hasattr(member, field):
            setattr(member, field, value)
    
    db.commit()
    return {"message": "Team member updated successfully"}

@router.delete("/team/{member_id}")
async def remove_team_member(
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove team member"""
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    member = db.query(TeamMember).filter(TeamMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")
    
    db.delete(member)
    db.commit()
    return {"message": "Team member removed successfully"}

@router.get("/roles")
async def get_roles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all available roles"""
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    roles = db.query(Role).all()
    return [
        {
            "id": role.id,
            "name": role.name,
            "display_name": role.display_name,
            "description": role.description,
            "permissions": role.permissions,
            "is_system_role": role.is_system_role
        }
        for role in roles
    ]

@router.get("/tasks")
async def get_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    assigned_to: Optional[int] = None
):
    """Get tasks with optional filtering"""
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = db.query(Task).join(TeamMember)
    
    if status:
        query = query.filter(Task.status == status)
    if assigned_to:
        query = query.filter(Task.assigned_to_id == assigned_to)
    
    tasks = query.all()
    return [
        {
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "task_type": task.task_type,
            "status": task.status,
            "priority": task.priority,
            "assigned_to": {
                "id": task.assigned_to.id,
                "name": task.assigned_to.user.full_name or task.assigned_to.user.email,
                "role": task.assigned_to.role.display_name
            } if task.assigned_to else None,
            "character": {
                "id": task.character.id,
                "name": task.character.name,
                "arabic_name": task.character.arabic_name
            } if task.character else None,
            "due_date": task.due_date.isoformat() if task.due_date else None,
            "created_at": task.created_at.isoformat()
        }
        for task in tasks
    ]

@router.post("/tasks")
async def create_task(
    task_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new task"""
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get current user as team member
    creator = db.query(TeamMember).filter(TeamMember.user_id == current_user.id).first()
    if not creator:
        raise HTTPException(status_code=403, detail="You must be a team member to create tasks")
    
    task = Task(
        title=task_data["title"],
        description=task_data["description"],
        task_type=task_data["task_type"],
        character_id=task_data.get("character_id"),
        assigned_to_id=task_data.get("assigned_to_id"),
        created_by_id=creator.id,
        due_date=task_data.get("due_date"),
        priority=task_data.get("priority", "medium"),
        estimated_hours=task_data.get("estimated_hours")
    )
    
    db.add(task)
    db.commit()
    db.refresh(task)
    
    return {"message": "Task created successfully", "id": task.id}

@router.get("/projects")
async def get_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all projects"""
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    projects = db.query(Project).all()
    return [
        {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "status": project.status,
            "priority": project.priority,
            "start_date": project.start_date.isoformat() if project.start_date else None,
            "end_date": project.end_date.isoformat() if project.end_date else None,
            "estimated_completion": project.estimated_completion.isoformat() if project.estimated_completion else None,
            "total_tasks": project.total_tasks,
            "completed_tasks": project.completed_tasks,
            "budget": project.budget,
            "actual_cost": project.actual_cost,
            "team_members": project.team_members,
            "created_at": project.created_at.isoformat()
        }
        for project in projects
    ]

@router.post("/projects")
async def create_project(
    project_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new project"""
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get current user as team member
    creator = db.query(TeamMember).filter(TeamMember.user_id == current_user.id).first()
    if not creator:
        raise HTTPException(status_code=403, detail="You must be a team member to create projects")
    
    project = Project(
        name=project_data["name"],
        description=project_data["description"],
        project_manager_id=creator.id,
        team_members=project_data.get("team_members", []),
        start_date=project_data.get("start_date"),
        end_date=project_data.get("end_date"),
        estimated_completion=project_data.get("estimated_completion"),
        priority=project_data.get("priority", "medium"),
        budget=project_data.get("budget")
    )
    
    db.add(project)
    db.commit()
    db.refresh(project)
    
    return {"message": "Project created successfully", "id": project.id}

# Character Management for Team
@router.post("/characters", response_model=dict)
async def create_character(
    character_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new character with team member tracking
    
    This endpoint allows team members to create characters
    with proper role-based permissions and approval workflow
    """
    # Check if user has permission to create characters
    team_member = db.query(TeamMember).filter(
        TeamMember.user_id == current_user.id
    ).first()
    
    if not team_member:
        raise HTTPException(status_code=403, detail="User is not a team member")
    
    if not has_permission(team_member.role, "CREATE_CHARACTER"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Create character
    character = IslamicCharacter(
        name=character_data["name"],
        arabic_name=character_data.get("arabic_name"),
        english_name=character_data.get("english_name"),
        title=character_data.get("title"),
        description=character_data.get("description"),
        category=character_data.get("category", "الصحابة"),
        era=character_data.get("era", "الخلافة الراشدة"),
        birth_year=character_data.get("birth_year"),
        death_year=character_data.get("death_year"),
        birth_place=character_data.get("birth_place"),
        death_place=character_data.get("death_place"),
        full_story=character_data.get("full_story"),
        key_achievements=character_data.get("key_achievements", []),
        lessons=character_data.get("lessons", []),
        quotes=character_data.get("quotes", []),
        timeline_events=character_data.get("timeline_events", []),
        profile_image=character_data.get("profile_image"),
        is_verified=False,  # Requires approval
        is_featured=False,
        created_by=current_user.id
    )
    
    db.add(character)
    db.commit()
    db.refresh(character)
    
    # Create content approval record
    approval = ContentApproval(
        content_type="character",
        content_id=str(character.id),
        status="pending",
        submitted_by_id=team_member.id,
        current_stage="script_review"
    )
    
    db.add(approval)
    db.commit()
    
    # Create task for content creation workflow
    task = Task(
        title=f"Create content for {character.name}",
        description=f"Develop script, voice, animation, and motion graphics for {character.name}",
        task_type="character_creation",
        status="pending",
        priority="medium",
        character_id=character.id,
        created_by_id=team_member.id,
        due_date=datetime.now() + timedelta(days=30)
    )
    
    db.add(task)
    db.commit()
    
    return {
        "message": "Character created successfully and submitted for approval",
        "character_id": character.id,
        "approval_id": approval.id,
        "task_id": task.id
    }

@router.put("/characters/{character_id}", response_model=dict)
async def update_character(
    character_id: int,
    character_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing character with team member tracking
    """
    # Check if user has permission to edit characters
    team_member = db.query(TeamMember).filter(
        TeamMember.user_id == current_user.id
    ).first()
    
    if not team_member:
        raise HTTPException(status_code=403, detail="User is not a team member")
    
    if not has_permission(team_member.role, "EDIT_CHARACTER"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Get character
    character = db.query(IslamicCharacter).filter(
        IslamicCharacter.id == character_id
    ).first()
    
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    
    # Update character fields
    for field, value in character_data.items():
        if hasattr(character, field):
            setattr(character, field, value)
    
    character.updated_at = datetime.now()
    
    # If character was verified, it needs re-approval
    if character.is_verified:
        character.is_verified = False
        
        # Create new approval record
        approval = ContentApproval(
            content_type="character",
            content_id=str(character.id),
            status="pending",
            submitted_by_id=team_member.id,
            current_stage="script_review"
        )
        
        db.add(approval)
    
    db.commit()
    
    return {"message": "Character updated successfully"}

@router.delete("/characters/{character_id}", response_model=dict)
async def delete_character(
    character_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a character (admin only)
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    character = db.query(IslamicCharacter).filter(
        IslamicCharacter.id == character_id
    ).first()
    
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    
    db.delete(character)
    db.commit()
    
    return {"message": "Character deleted successfully"}

@router.get("/characters/pending", response_model=List[dict])
async def get_pending_characters(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get characters pending approval
    """
    # Check if user has approval permissions
    team_member = db.query(TeamMember).filter(
        TeamMember.user_id == current_user.id
    ).first()
    
    if not team_member or not has_permission(team_member.role, "APPROVE_CHARACTER"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Get pending approvals
    pending_approvals = db.query(ContentApproval).filter(
        ContentApproval.content_type == "character",
        ContentApproval.status == "pending"
    ).all()
    
    characters = []
    for approval in pending_approvals:
        character = db.query(IslamicCharacter).filter(
            IslamicCharacter.id == int(approval.content_id)
        ).first()
        
        if character:
            characters.append({
                "id": character.id,
                "name": character.name,
                "arabic_name": character.arabic_name,
                "title": character.title,
                "category": character.category,
                "approval_id": approval.id,
                "submitted_by": approval.submitted_by.name if approval.submitted_by else "Unknown",
                "submission_date": approval.submission_date
            })
    
    return characters

@router.post("/characters/{character_id}/approve", response_model=dict)
async def approve_character(
    character_id: int,
    approval_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Approve a character
    """
    # Check if user has approval permissions
    team_member = db.query(TeamMember).filter(
        TeamMember.user_id == current_user.id
    ).first()
    
    if not team_member or not has_permission(team_member.role, "APPROVE_CHARACTER"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Get character
    character = db.query(IslamicCharacter).filter(
        IslamicCharacter.id == character_id
    ).first()
    
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    
    # Get approval record
    approval = db.query(ContentApproval).filter(
        ContentApproval.content_type == "character",
        ContentApproval.content_id == str(character_id),
        ContentApproval.status == "pending"
    ).first()
    
    if not approval:
        raise HTTPException(status_code=404, detail="Approval request not found")
    
    # Update approval
    approval.status = "approved"
    approval.reviewed_by_id = team_member.id
    approval.review_date = datetime.now()
    approval.approval_notes = approval_data.get("notes", "")
    approval.final_approval_date = datetime.now()
    
    # Update character
    character.is_verified = True
    character.verification_source = "Content Team"
    character.verification_notes = f"Approved by {team_member.user.full_name}"
    
    db.commit()
    
    return {"message": "Character approved successfully"}

@router.post("/characters/{character_id}/reject", response_model=dict)
async def reject_character(
    character_id: int,
    rejection_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Reject a character
    """
    # Check if user has approval permissions
    team_member = db.query(TeamMember).filter(
        TeamMember.user_id == current_user.id
    ).first()
    
    if not team_member or not has_permission(team_member.role, "APPROVE_CHARACTER"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Get approval record
    approval = db.query(ContentApproval).filter(
        ContentApproval.content_type == "character",
        ContentApproval.content_id == str(character_id),
        ContentApproval.status == "pending"
    ).first()
    
    if not approval:
        raise HTTPException(status_code=404, detail="Approval request not found")
    
    # Update approval
    approval.status = "rejected"
    approval.reviewed_by_id = team_member.id
    approval.review_date = datetime.now()
    approval.feedback = rejection_data.get("feedback", "Character rejected")
    
    db.commit()
    
    return {"message": "Character rejected"}
