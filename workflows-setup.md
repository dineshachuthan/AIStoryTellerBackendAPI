# Setting Up Custom Workflows for Separated Projects

## Current Problem
- The redirect script causes port conflicts (two processes on port 5000)
- We need proper workflows for backend and frontend separation

## Solution: Create Custom Workflows

### Backend Workflow
```toml
[[workflows.workflow]]
name = "Backend API"
author = "agent"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "cd backend-project && npm run dev"
waitForPort = 5000
```

### Frontend Workflow  
```toml
[[workflows.workflow]]
name = "Frontend App"
author = "agent"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "cd frontend-project && npm run dev"
waitForPort = 5173
```

### Combined Workflow (Run Both)
```toml
[[workflows.workflow]]
name = "Full Stack"
mode = "parallel"
author = "agent"

[[workflows.workflow.tasks]]
task = "workflow.run"
args = "Backend API"

[[workflows.workflow.tasks]]
task = "workflow.run"
args = "Frontend App"
```

## Benefits
- Clean separation of concerns
- No port conflicts
- No bandaid fixes needed
- Can run backend and frontend independently
- True project isolation

## Implementation Steps
1. Remove redirect script and root package.json
2. Add these workflow configurations
3. Test each workflow independently
4. Verify both projects work together

Would you like me to implement this approach?