# Configuration Checklist - Weekly Product Digest Generator

This checklist contains all the information you need to gather to configure and run the Weekly Product Digest Generator.

## 🔑 API Keys & Tokens

### 1. Slack Configuration
**Where to find:** https://api.slack.com/apps

**Required:**
- [ ] **Bot User OAuth Token** (starts with `xoxb-`)
  - Go to your Slack app → OAuth & Permissions
  - Copy the "Bot User OAuth Token"
  - Required scopes: `channels:read`, `channels:history`, `users:read`, `chat:write`

- [ ] **App Signing Secret**
  - Go to your Slack app → Basic Information
  - Copy the "Signing Secret"

**Optional for slash commands:**
- [ ] **Slash command endpoint URL** (if deploying to cloud)
- [ ] **Event subscription URL** (if using events)

### 2. Jira Configuration
**Where to find:** https://id.atlassian.com/manage-profile/security/api-tokens

**Required:**
- [ ] **Jira Base URL**
  - Format: `https://your-company.atlassian.net`
  - Find this in your Jira instance URL

- [ ] **Email Address**
  - Your Jira account email address

- [ ] **API Token**
  - Go to https://id.atlassian.com/manage-profile/security/api-tokens
  - Click "Create API token"
  - Give it a label like "Weekly Digest Generator"
  - Copy the generated token

**Jira Project Hierarchy:**
- [ ] **Project Key** (e.g., `PLAT`, `MOB`, `DATA`)
- [ ] **Project Name** (e.g., `Platform`, `Mobile`, `Data`)
- [ ] **Workstreams** for each squad:
  - Workstream names and keys
  - Workstream descriptions
  - Example: `API Infrastructure` (key: `API-INFRA`)

**Custom Fields (Required):**
- [ ] **Team Field ID** (e.g., `customfield_10015`)
  - This field should contain the squad name
  - Used to filter issues by squad

- [ ] **Workstream Field ID** (e.g., `customfield_10016`)
  - This field links epics to workstreams
  - Used to build the hierarchy

- [ ] **Story Points Field ID** (e.g., `customfield_10003`)
  - Used for velocity calculations

**Custom Fields (Optional but Recommended):**
- [ ] **Target Quarter Field ID** (e.g., `customfield_10001`)
- [ ] **Confidence Field ID** (e.g., `customfield_10002`)
- [ ] **Epic Link Field ID** (e.g., `customfield_10014`)

**How to find field IDs:**
1. Go to any issue in Jira
2. Open browser developer tools (F12)
3. Look for `customfield_` in the page source
4. Or use Jira's REST API: `/rest/api/3/field`

### 3. Notion Configuration
**Where to find:** https://www.notion.so/my-integrations

**Required:**
- [ ] **Integration API Key** (starts with `secret_`)
  - Go to https://www.notion.so/my-integrations
  - Click "New integration"
  - Give it a name like "Weekly Digest Generator"
  - Copy the "Internal Integration Token"

- [ ] **Database ID**
  - Create a new database in Notion for digest pages
  - Copy the database ID from the URL: `https://notion.so/workspace/database-id`
  - The database should have these properties:
    - Squad (Title)
    - Week Start (Date)
    - Week End (Date)
    - Velocity (Number)
    - Shipped Count (Number)
    - Risk Count (Number)
    - Status (Select)

### 4. GitHub Configuration
**Where to find:** https://github.com/settings/tokens

**Required:**
- [ ] **Personal Access Token**
  - Go to https://github.com/settings/tokens
  - Click "Generate new token (classic)"
  - Select scopes: `repo`, `read:org`
  - Copy the generated token

- [ ] **Organization Name**
  - Your GitHub organization name (e.g., `your-company`)

**Alternative: GitHub App (Recommended for production)**
- [ ] **GitHub App ID**
- [ ] **GitHub App Private Key**
- [ ] **Installation ID**

### 5. OpenAI Configuration
**Where to find:** https://platform.openai.com/api-keys

**Required:**
- [ ] **API Key**
  - Go to https://platform.openai.com/api-keys
  - Click "Create new secret key"
  - Copy the generated key

**Optional:**
- [ ] **Model** (default: `gpt-4`)
- [ ] **Max Tokens** (default: `2000`)
- [ ] **Temperature** (default: `0.3`)

## 👥 Squad Configuration

### 6. Squad Information
**File to edit:** `config/squads.json`

**For each squad, gather:**
- [ ] **Squad Name** (e.g., "Platform Squad")
- [ ] **Squad Description** (e.g., "Core platform infrastructure and APIs")
- [ ] **Squad Members:**
  - Full Name
  - Slack Handle (e.g., `@johndoe`)
  - GitHub Username
  - Email Address
  - Role (e.g., "Tech Lead", "Senior Engineer")

- [ ] **Jira Configuration:**
  - Project Key (e.g., `PLAT`)
  - Project Name (e.g., `Platform`)
  - Workstreams:
    - Name (e.g., `API Infrastructure`)
    - Key (e.g., `API-INFRA`)
    - Description (e.g., `Core API platform and infrastructure`)

- [ ] **Slack Channel** (e.g., `#platform-squad`)
- [ ] **Notion Roadmap URL** (optional)
- [ ] **GitHub Repositories** (e.g., `["platform-api", "platform-ui"]`)
- [ ] **Tags** (e.g., `["platform", "infrastructure"]`)

### 7. Global Settings
**File to edit:** `config/squads.json`

**Required:**
- [ ] **Shared Slack Channels** (e.g., `["#product", "#engineering"]`)
- [ ] **Output Notion Database ID** (same as step 3)
- [ ] **Run Window:**
  - Start Day (e.g., `"monday"`)
  - Start Time (e.g., `"00:00"`)
  - End Day (e.g., `"sunday"`)
  - End Time (e.g., `"23:59"`)

**Jira Custom Field Mappings:**
- [ ] **Team Field ID** (e.g., `customfield_10015`)
- [ ] **Workstream Field ID** (e.g., `customfield_10016`)
- [ ] **Story Points Field ID** (e.g., `customfield_10003`)
- [ ] **Target Quarter Field ID** (e.g., `customfield_10001`)
- [ ] **Confidence Field ID** (e.g., `customfield_10002`)
- [ ] **Epic Link Field ID** (e.g., `customfield_10014`)

**Jira Hierarchy Configuration:**
- [ ] **Workstream Issue Type** (e.g., `Workstream`)
- [ ] **Epic Issue Type** (e.g., `Epic`)
- [ ] **Story Issue Type** (e.g., `Story`)
- [ ] **Task Issue Type** (e.g., `Task`)
- [ ] **Bug Issue Type** (e.g., `Bug`)

**Optional:**
- [ ] **Risk Thresholds**
- [ ] **AI Settings**
- [ ] **Notification Settings**

## 🔧 Technical Configuration

### 8. Environment Setup
**File to edit:** `.env`

**Required Environment Variables:**
```bash
# Slack
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret

# Jira
JIRA_BASE_URL=https://your-company.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-api-token

# Notion
NOTION_API_KEY=secret-your-notion-api-key
NOTION_DATABASE_ID=your-database-id

# GitHub
GITHUB_TOKEN=your-github-token
GITHUB_ORG=your-organization

# OpenAI
OPENAI_API_KEY=your-openai-api-key
```

**Optional Environment Variables:**
```bash
# AI Configuration
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.3

# Logging
LOG_LEVEL=info
LOG_TO_CONSOLE=false

# Environment
NODE_ENV=production
```

### 9. Jira Field Mappings
**File to edit:** `config/squads.json` (in globalSettings.jiraCustomFields)

**Required Field IDs:**
- [ ] **Team Field ID** (e.g., `customfield_10015`) - **CRITICAL**
- [ ] **Workstream Field ID** (e.g., `customfield_10016`) - **CRITICAL**
- [ ] **Story Points Field ID** (e.g., `customfield_10003`)
- [ ] **Target Quarter Field ID** (e.g., `customfield_10001`)
- [ ] **Confidence Field ID** (e.g., `customfield_10002`)
- [ ] **Epic Link Field ID** (e.g., `customfield_10014`)

**How to find field IDs:**
1. Go to any issue in Jira
2. Open browser developer tools (F12)
3. Look for `customfield_` in the page source
4. Or use Jira's REST API: `/rest/api/3/field`

### 10. Slack Channel IDs
**How to find:**
1. Go to the channel in Slack
2. Right-click the channel name
3. Select "Copy link"
4. The channel ID is in the URL: `https://slack.com/app_redirect?channel=C1234567890`
5. The ID is `C1234567890`

**Required:**
- [ ] Squad-specific channel IDs
- [ ] Shared channel IDs (e.g., `#product`, `#engineering`)

## 🚀 Deployment Configuration

### 11. Production Environment
**Choose one:**
- [ ] **Local Server with Cron**
  - Set up cron job: `30 7 * * 1 cd /path/to/weekly-product-digest-generator && npm run digest generate`

- [ ] **Cloud Deployment (AWS/GCP/Azure)**
  - Set up environment variables in cloud platform
  - Configure scheduled execution
  - Set up monitoring and alerting

- [ ] **Docker Deployment**
  - Create Dockerfile
  - Set up container orchestration
  - Configure volume mounts for logs

### 12. Monitoring & Alerting
**Optional but Recommended:**
- [ ] **Log aggregation service** (e.g., DataDog, Splunk, ELK)
- [ ] **Error alerting** (e.g., PagerDuty, Slack notifications)
- [ ] **Performance monitoring** (e.g., New Relic, AppDynamics)
- [ ] **Health check endpoint** for monitoring

## 🔒 Security & Permissions

### 13. Access Control
**Required:**
- [ ] **Jira Permissions**
  - Verify API token has access to all squad projects
  - Check issue visibility permissions
  - Verify Team field is accessible and populated

- [ ] **GitHub Permissions**
  - Verify token has access to all squad repositories
  - Check organization access

- [ ] **Slack Permissions**
  - Verify bot has access to all configured channels
  - Check message history access

- [ ] **Notion Permissions**
  - Verify integration has access to target database
  - Check page creation permissions

### 14. Data Privacy
**Review:**
- [ ] **Data retention policies**
- [ ] **Sensitive data handling**
- [ ] **Compliance requirements** (GDPR, SOC2, etc.)
- [ ] **Audit logging**

## 🧪 Testing & Validation

### 15. Pre-deployment Testing
**Required:**
- [ ] **Run setup script:** `npm run setup`
- [ ] **Validate configuration:** `npm run validate-config`
- [ ] **Test dry run:** `npm run digest generate -- --dry-run`
- [ ] **Test single squad:** `npm run digest generate -- --squad "Squad Name" --dry-run`

### 16. Integration Testing
**Test each component:**
- [ ] **Jira API connectivity**
- [ ] **GitHub API connectivity**
- [ ] **Slack API connectivity**
- [ ] **Notion API connectivity**
- [ ] **OpenAI API connectivity**

**Jira Hierarchy Testing:**
- [ ] **Verify Team field filtering works**
- [ ] **Verify Workstream field linking works**
- [ ] **Test hierarchy building (Workstream → Epic → Issue)**
- [ ] **Verify custom field mappings**

## 📋 Final Checklist

### Before First Run:
- [ ] All API keys and tokens configured
- [ ] Squad configuration completed with workstreams
- [ ] Environment variables set
- [ ] Notion database created with correct properties
- [ ] Slack bot installed and configured
- [ ] Jira custom fields identified (especially Team and Workstream fields)
- [ ] GitHub repositories accessible
- [ ] Test run completed successfully
- [ ] Monitoring and alerting configured
- [ ] Team notified about new digest system

### After First Run:
- [ ] Review generated digest quality
- [ ] Adjust AI prompts if needed
- [ ] Fine-tune risk thresholds
- [ ] Update squad configurations
- [ ] Set up regular monitoring
- [ ] Document any customizations
- [ ] Train team on new process

## 🆘 Troubleshooting

### Common Issues:
1. **API Rate Limits** - Check usage and implement rate limiting
2. **Permission Errors** - Verify API tokens have correct scopes
3. **Missing Data** - Check field mappings and project access
4. **AI Generation Failures** - Verify OpenAI API key and quota
5. **Notion Publishing Errors** - Check database permissions and structure
6. **Jira Hierarchy Issues** - Verify Team and Workstream field mappings
7. **Empty Results** - Check Team field values match squad names exactly

### Support Resources:
- [ ] Check logs in `logs/` directory
- [ ] Review `OPERATIONS.md` for detailed information
- [ ] Run validation scripts to identify issues
- [ ] Check API documentation for service-specific issues
- [ ] Contact development team for assistance

---

**Note:** This checklist should be completed before running the Weekly Product Digest Generator in production. Keep this document updated as your configuration evolves.
