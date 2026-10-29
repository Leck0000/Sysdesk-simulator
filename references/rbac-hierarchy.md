# RBAC Hierarchy Model

## org → cohort → assignment → technician

### Organization Level
- **Principals**: Admin, Manager
- **Permissions**: `org:manage`, `org:view_users`, `org:view_analytics`
- **Data**: Tenant config, billing, global settings

### Cohort Level
- **Principals**: Instructor, Lead
- **Permissions**: `cohort:manage_{id}`, `cohort:view_progress_{id}`
- **Data**: Enrollment, schedule, assigned labs

### Assignment Level
- **Principals**: Instructor, Technician
- **Permissions**: `assignment:view_{id}`, `assignment:update_{id}`
- **Data**: Lab→technician mapping, due dates, overrides

### Technician Level
- **Principals**: Trainee (self)
- **Permissions**: `assignment:view_own`, `progress:view_own`
- **Data**: Personal lab progress, submissions, feedback

### Hierarchy Enforcement
- Technician's `assignment_id` must belong to an `cohort_id` within the `org_id`
- Permissions cascade downward only — org admin can inspect any cohort/assignment
- Cohort instructor cannot access other cohorts

### Permission Names (exact values)
- `org:manage`, `org:view_users`, `org:view_analytics`
- `cohort:manage_{id}`, `cohort:view_progress_{id}`
- `assignment:view_{id}`, `assignment:update_{id}`
- `assignment:view_own`, `progress:view_own`

### Hierarchy Visualization
```
org:{id}
  └── cohort:{id}
        └── assignment:{id}
              └── technician:{id}
```

### RBAC in API
- All API paths include org/cohort scope prefix for vertical isolation
- Example: `GET /api/v1/orgs/{org_id}/cohorts/{cohort_id}/assignments`
- Example: `GET /api/v1/orgs/{org_id}/cohorts/{cohort_id}/assignments/{assignment_id}/progress`