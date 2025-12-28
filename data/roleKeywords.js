/**
 * Predefined keyword sets for common job roles.
 * Used for Manual ATS Fallback when AI is unavailable or limit is exceeded.
 */

const ROLE_KEYWORDS = {
    "Web Developer": {
        keywords: ["HTML", "CSS", "JavaScript", "React", "Node.js", "Git", "Responsive Design", "API", "Frontend", "Backend"],
        minMatch: 4
    },
    "MERN Stack Developer": {
        keywords: ["MongoDB", "Express.js", "React", "Node.js", "Redux", "REST API", "JavaScript", "NoSQL", "Git", "JWT"],
        minMatch: 5
    },
    "Frontend Developer": {
        keywords: ["React", "Vue", "Angular", "HTML5", "CSS3", "JavaScript", "TypeScript", "Tailwind", "Redux", "UI/UX"],
        minMatch: 5
    },
    "Backend Developer": {
        keywords: ["Node.js", "Express", "Python", "Django", "Java", "Spring Boot", "SQL", "NoSQL", "API", "Docker"],
        minMatch: 5
    },
    "Data Analyst": {
        keywords: ["Python", "SQL", "Excel", "Tableau", "Power BI", "Data Visualization", "Statistics", "R", "Pandas", "NumPy"],
        minMatch: 5
    },
    "DevOps Engineer": {
        keywords: ["Docker", "Kubernetes", "AWS", "CI/CD", "Jenkins", "Linux", "Terraform", "Azure", "Cloud", "Scripting"],
        minMatch: 5
    },
    "QA Engineer": {
        keywords: ["Selenium", "Cypress", "Manual Testing", "Automation", "Jira", "SQL", "Test Cases", "Bug Tracking", "API Testing"],
        minMatch: 4
    },
    // Default fallback if no specific role matches well
    "General Software Engineer": {
        keywords: ["Data Structures", "Algorithms", "Git", "Agile", "Problem Solving", "Debugging", "SDLC", "Teamwork"],
        minMatch: 3
    }
};

module.exports = ROLE_KEYWORDS;
