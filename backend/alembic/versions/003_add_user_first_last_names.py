"""Add first_name and last_name to User model

Revision ID: 003
Revises: 002
Create Date: 2026-01-25 16:48:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    # Add first_name and last_name columns to users table
    op.add_column('users', sa.Column('first_name', sa.String(100), nullable=True))
    op.add_column('users', sa.Column('last_name', sa.String(100), nullable=True))


def downgrade():
    # Remove first_name and last_name columns
    op.drop_column('users', 'last_name')
    op.drop_column('users', 'first_name')
