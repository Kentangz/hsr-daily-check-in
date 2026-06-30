# Security Risk and Terms of Service (ToS) Analysis

This document provides a comprehensive security and risk analysis of automating the daily HoYoLAB check-in process for *Honkai: Star Rail* using this repository.

---

## 1. Terms of Service (ToS) Violation

### HoYoverse Official Policy

Under the **Terms of Service of COGNOSPHERE PTE. LTD. (HoYoverse)**, the use of automated tools, scripts, plug-ins, or macros is strictly prohibited.

Specifically, **Section 4: User Conduct and Forbidden Acts** states that you agree not to:

* Use or distribute unauthorized third-party software, plug-ins, scripts, bots, or applications designed to interact with HoYoverse services.
* Automate gameplay, check-ins, or actions that are intended to be performed manually by users through the official browser or mobile app.
* Interfere with or disrupt the normal operation of HoYoverse's services.

### Potential Consequences

If HoYoverse detects the use of automation scripts, they reserve the right to impose penalties on the offending accounts. These penalties may include:

1. **Warnings** sent via in-game mail or HoYoLAB notification.
2. **Removal of Rewards** obtained inappropriately through automation.
3. **Temporary Account Suspension** for both the HoYoLAB account and the associated game accounts (*Honkai: Star Rail*, *Genshin Impact*, *Zenless Zone Zero*).
4. **Permanent Account Banning** in severe or recurring cases of automation violations.

---

## 2. Technical Detection Risks

Automated scripts running on cloud platforms have distinct footprints that differentiate them from human users. The following are the primary detection vectors:

### A. IP Reputation & Cloud Hosting Footprints

* **Vector:** When hosted on platforms like **Vercel**, **AWS**, **GCP**, or **Heroku**, all outbound API requests originate from public cloud IP ranges.
* **Risk:** HoYoverse employs Web Application Firewalls (WAF) and CDNs (e.g., Cloudflare) that maintain databases of cloud hosting IP ranges. A high volume of requests hitting the `/event/luna/os/sign` endpoint from cloud IPs is highly suspicious and easily flagged.

### B. Temporal Patterns (Fixed Schedules)

* **Vector:** The default configuration triggers the Vercel Cron job at a fixed time daily (e.g., `16:01 UTC`).
* **Risk:** Human users perform check-ins at irregular times. An account that performs a check-in at the exact same millisecond or second every day over several weeks is a clear mathematical signature of a bot.

### C. Client Fingerprinting & Request Headers

* **Vector:** The HTTP client headers sent by the serverless function.
* **Risk:** If the headers (such as `User-Agent`, `Accept-Language`, and `Referer`) do not exactly mimic a standard web browser, or if they lack typical browser-specific headers, security filters will flag the request as automated traffic.

---

## 3. Credential Security Risks

This repository requires you to store your HoYoLAB login cookies (`ltoken_v2` and `ltuid_v2`) to authenticate requests.

### A. Cookie Exposure

* **Risk:** Sessional cookies (`ltoken_v2` and `ltuid_v2`) grant access to your HoYoLAB profile, forum actions, and checking history. While they do not grant direct access to change your main game password (which requires multi-factor authentication), they represent a major security vector.

### B. Database Compromise

* **Risk:** While this project uses **AES-256-GCM** to encrypt cookies at rest in Supabase, the security depends entirely on the secrecy of your `ENCRYPTION_KEY` and the protection of your Supabase project. If your `SUPABASE_SERVICE_ROLE_KEY` or `ENCRYPTION_KEY` is leaked (e.g., committed to a public Git repository), an attacker can decrypt all stored cookies.

---

## 4. Best Practices & Risk Mitigation

If you choose to run this dashboard, implement the following mitigations to minimize detection and enhance security:

* **Secure Environment Variables:** Never hardcode secrets. Ensure `.env.local` is added to `.gitignore`. If deploying to Vercel, keep repository commits entirely separate from public branches, and deploy using the Vercel CLI manually.
* **Revoke Cookies Immediately If Compromised:** If you suspect your database has been compromised, log out of HoYoLAB manually via your browser. This invalidates the active `ltoken_v2` and `ltuid_v2` tokens on HoYoverse's authorization servers.

---

## 5. Sources and References

1. **HoYoverse Terms of Service:** [https://genshin.hoyoverse.com/en/company/terms](https://genshin.hoyoverse.com/en/company/terms) - *Section 4 details prohibited conduct regarding third-party software and automation.*
2. **HoYoLAB Anti-Cheat & Fair Play Declarations:** Standard platform announcements regarding suspensions for unauthorized tool and script usage.
3. **WAF Bot Detection Standards:** Industry documentation on how Web Application Firewalls detect automated traffic using IP reputation, TLS fingerprinting, and temporal anomaly detection.
