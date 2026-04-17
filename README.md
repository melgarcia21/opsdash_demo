## I. Project Overview

* **Project Title:** OpsDash: An Executive Operations Intelligence Dashboard for SME Manufacturing CEOs
* **Background (Problem):** Christian, a 45-year-old Upper Class CEO running a manufacturing business in Forbes Park, leads a company under pressure from rising production costs, intense market competition, and sustainability demands. His core operational weakness is being frequently detached from day-to-day operations, relying on delayed, fragmented reports. This information gap leads to overconfident decisions made without real-time data, resulting in quality inconsistencies and cost inefficiencies.

### Objectives
* **General Objective:** To develop a web-based operations dashboard that gives Christian real-time visibility into his business's Key Performance Indicators (KPIs), enabling data-driven decisions without requiring his physical presence on the floor.
* **Specific Objectives:**
    * Build a centralized dashboard displaying real-time KPIs, production output, defect rates, operational costs, and team performance.
    * Implement an automated alert and reporting system to notify the CEO of critical deviations (e.g., quality dips, cost overruns) for immediate action while offsite.

---

## II. Design Thinking Summary

### Empathize
* **Target Users:** Manufacturing CEOs/owners managing remotely; operations managers submitting manual reports.
* **Needs/Pain Points:** No "single source of truth"; delayed/inconsistent reporting; inability to monitor quality/costs in real-time; time wasted on manual report compilation.

### Define
* **Problem Statement:** *"Christian, a detached manufacturing CEO, lacks a centralized real-time system to monitor production quality and costs, causing reactive rather than proactive business decisions."*
* **Root Cause:** Over-reliance on manual, fragmented reporting with no digital feedback loop between the factory floor and executive decision-making.

### Ideate
* **Chosen Solution:** Web-based Executive Operations Dashboard (**OpsDash**).
* **Reason:** Software-based and buildable by a student team using a common web stack (React, Node.js, PostgreSQL). It requires no hardware investment and directly addresses operational detachment at a low cost.

### Prototype
* **Type:** High-fidelity interactive web prototype / Functional MVP.
* **Key Features:**
    * KPI summary cards (Daily production, defect %, cost vs. budget).
    * Historical trend charts (Weekly/Monthly).
    * Alert/notification system (Email/In-app) for threshold breaches.
    * Supervisor report submission form.
    * Role-based access (CEO vs. Supervisor).

---

## III. Solution Description

**OpsDash** is a lightweight, web-based executive operations dashboard designed for manufacturing SME CEOs. It consolidates metrics into a single, role-based interface accessible via any browser or mobile device.

### How it Works
1.  **Input:** Floor supervisors log in and submit structured reports (production counts, defects, costs) via a simple digital form.
2.  **Aggregation:** The system processes submissions into visual KPI cards and trend charts for the CEO.
3.  **Alerts:** If a metric breaches a pre-set threshold (e.g., defect rate > 5%), an automated alert is sent via email.
4.  **Analysis:** The CEO can view historical performance, drill into departments, and export reports for meetings.

### Key Features
* Real-time KPI dashboard
* Supervisor report submission module
* Threshold-based email notifications
* Role-based access control
* Export reports to PDF or CSV
* Mobile-responsive design

---

## IV. Business Overview

* **Target Users:** SME manufacturing owners in the Philippines (Aged 35–60) managing 20–200 employees who need visibility without the cost of high-end ERP systems.
* **Value Proposition:** *"Know what's happening on your factory floor from Forbes Park, from the golf course, or from anywhere—without waiting for the next morning's report."*

---

## V. Feasibility

| Category | Details |
| :--- | :--- |
| **Technical** | Buildable using React (frontend), Node.js (backend), and PostgreSQL. Hosted on free/low-cost tiers like Vercel or Render. |
| **Operational** | Minimal training required for supervisors; CEO dashboard is read-only and intuitive. |
| **Economic** | Near-zero development cost for student teams. Commercial SaaS model potential: Break-even at 10–15 clients at ₱3,000/month. |

---

## VI. Impact

### User Benefits
* **CEO:** Real-time visibility without physical presence.
* **Supervisors:** Reduced time spent on manual paperwork.
* **Strategic:** Faster responses to issues and better long-term planning through historical data.

### Social/Business Impact
* Reduces waste/rework through early detection.
* Strengthens SME competitiveness in the Philippines.
* Empowers non-technical owners to adopt digital transformation.

---

## VII. Limitations and Improvements

* **Data Integrity:** Accuracy depends entirely on honest manual input ("Garbage In, Garbage Out").
* **Scope:** Not a full ERP; lacks accounting, payroll, or procurement.
* **Automation:** No IoT integration in the MVP stage (requires manual entry).
* **Connectivity:** Requires basic internet access to function.

---

## VIII. Conclusion

**OpsDash** bridges the gap between executive decision-making and factory-floor reality. By providing a simple, affordable, and accessible platform, the system addresses Christian’s core weaknesses of operational detachment and overconfidence. It is a technically feasible, commercially viable, and impactful tool designed to maximize profit and efficiency in the Philippine SME sector.