
**Product Requirements Document: Local Ledger (Working Title)**

**Version:** 1.0
**Date:** 2023-10-27
**Author:** [Your Name/AI Assistant]

**1. Introduction**

Local Ledger is a desktop application designed for users who want to track their personal finances using exported CSV bank statements while maintaining local control over their data. The application allows users to import transactions, categorize spending (manually, rule-based automatically, and with AI assistance), analyze spending patterns, and identify potential savings or anomalies. The application itself runs locally (built with Electron), storing all user financial data directly on the user's device. An internet connection is required solely for optional AI-powered features provided by the Google Gemini API.

**2. Goals**

*   **Empowerment through Data:** Provide users with a clear understanding of their spending habits by consolidating and categorizing bank transactions.
*   **Local Data Control & Privacy:** Ensure all financial transaction data is stored exclusively on the user's local machine, addressing privacy concerns.
*   **Efficient Categorization:** Streamline the categorization process through manual control, reusable rules based on vendors, and optional AI suggestions for new vendors.
*   **Actionable Insights:** Offer visual analysis and AI-driven insights to help users identify trends, potential savings, and spending anomalies.
*   **User Flexibility:** Allow users to manage their own spending categories and handle variations in bank CSV formats.

**3. User Personas**

*   **Privacy-Conscious Parker:** A tech-savvy individual who diligently tracks finances but is wary of cloud-based financial services storing their transaction data. They prefer desktop applications and want control over their information. They are comfortable using CSV exports from their bank and appreciate automation but want the final say.

**4. Functional Requirements**

**4.1. Data Import**

*   **FR1.1 CSV File Selection:** Users must be able to select one or multiple CSV files containing bank transactions for import.
*   **FR1.2 CSV Column Mapping:**
    *   Upon first import of a file *type* (or optionally, configurable per import), the user must be presented with a mapping interface.
    *   This interface must allow the user to map spreadsheet columns to required application fields: **Transaction Date**, **Transaction Description/Details**, **Transaction Amount (Debit/Credit or single column)**.
    *   The application should attempt basic auto-detection based on common headers (e.g., "Date", "Description", "Amount", "Debit", "Credit").
    *   The mapping configuration should ideally be saveable/reusable for future imports from the same bank/account format.
*   **FR1.3 Data Parsing:** The application must parse the data from the mapped columns in the selected CSV files.
    *   Handle common date formats.
    *   Handle different amount representations (e.g., single column with negative numbers for debits, separate Debit/Credit columns). Currency symbols should ideally be stripped or handled consistently.
*   **FR1.4 Duplicate Handling:** The application must detect and prevent the import of duplicate transactions (based on a combination of Date, Description, and Amount within a reasonable timeframe or existing data). The user should be notified of potential duplicates skipped.

**4.2. Data Storage**

*   **FR2.1 Local Persistence:** All imported transaction data, categories, and categorization rules must be stored locally on the user's device. (Suggested backend: SQLite database file, JSON files). No user financial data should be stored in the cloud by the application itself.
*   **FR2.2 Data Schema:** The storage should include (at minimum):
    *   Transactions: Unique ID, Date, Description (Raw), Amount, Category ID (nullable), IsUnexpectedExpense (boolean), Source File (optional).
    *   Categories: Unique ID, Name.
    *   Categorization Rules: Unique ID, Vendor/Description Pattern, Category ID.

**4.3. Transaction Categorization**

*   **FR3.1 Manual Categorization:** Users must be able to select one or multiple transactions and manually assign them to a category from the defined list.
*   **FR3.2 Category Management:**
    *   Users must be able to Create, Read, Update, and Delete spending categories.
    *   A default set of common categories can be provided, but should be fully editable.
*   **FR3.3 Rule-Based Automatic Categorization:**
    *   When new transactions are imported, the application must attempt to automatically categorize them based on existing rules.
    *   A rule maps a specific vendor/description pattern (extracted from the transaction description) to a specific category.
    *   If a transaction's description matches a known pattern, the corresponding category is automatically assigned.
*   **FR3.4 AI-Assisted Categorization (Google Gemini):**
    *   **Trigger:** This feature is triggered during import *only* for transactions that do *not* match any existing rule via FR3.3.
    *   **Process:** For each uncategorized transaction, the application sends the **Transaction Description** (and potentially amount/date for context) to the Google Gemini API, requesting a spending category suggestion.
    *   **User Interaction:** The suggested category from Gemini is presented to the user alongside the transaction. The user must **confirm** or **override** the suggestion by selecting a different category (or creating a new one).
    *   **Rule Creation:** Upon user confirmation/assignment of a category for a transaction initially categorized by Gemini (or manually for the first time for a vendor), the application should prompt the user if they want to create an automatic categorization rule for this vendor/description pattern.
*   **FR3.5 "Unexpected Expense" Flag:** Users must be able to flag individual transactions as "Unexpected" (e.g., car repair, medical bill). This should be a simple boolean flag per transaction.

**4.4. Data Viewing & Filtering**

*   **FR4.1 Transaction View:** Display imported transactions in a sortable list or table view, showing Date, Description, Amount, Assigned Category, and Unexpected Flag status.
*   **FR4.2 Filtering:** Users must be able to filter the transaction view based on:
    *   Date Range (Predefined: This Week, Last Week, This Month, Last Month, This Year, Last Year; Custom date range picker).
    *   Category (Select one or multiple categories).
    *   Unexpected Expense flag (Show All, Show Only Unexpected, Show Only Expected).
    *   Uncategorized Transactions.
*   **FR4.3 Sorting:** Allow sorting the transaction view by Date, Amount, Category, Description.

**4.5. Analysis & Reporting**

*   **FR5.1 Dashboard/Reporting View:** A dedicated section for visualizing spending data.
*   **FR5.2 Spending Charts:** Provide charts based on the currently filtered data:
    *   **Category Breakdown:** Pie or Donut chart showing the proportion of spending per category for the selected period.
    *   **Spending Trends:** Line or Bar chart showing spending per category over time (e.g., monthly spending for the last 12 months within a selected category, or total spending per month).
*   **FR5.3 AI-Powered Analysis (Google Gemini):**
    *   **Trigger:** User explicitly requests AI analysis for the currently filtered data set (e.g., via a button "Analyze Spending with AI").
    *   **Process:** The application aggregates spending data (e.g., category totals, spending over time per category) for the selected period. This aggregated, *potentially anonymized* data is sent to the Google Gemini API with a prompt focused on identifying **potential savings opportunities** and **spending anomalies/outliers** compared to trends within the provided data.
    *   **Output:** Display the textual insights returned by Gemini to the user.

**4.6. Configuration**

*   **FR6.1 Gemini API Key:** Users must be able to securely input and store their Google Gemini API Key. This key should *not* be stored in plain text. (Leverage OS secure storage if possible).
*   **FR6.2 Category Management Access:** Provide access to the category management interface (FR3.2).
*   **FR6.3 CSV Mapping Management:** Allow viewing and potentially editing/deleting saved CSV mapping configurations (from FR1.2).

**5. Non-Functional Requirements**

*   **NFR1. Platform:** Desktop application built using Electron, targeting compatibility with major operating systems (Windows, macOS, Linux - specify primary targets if needed).
*   **NFR2. Performance:**
    *   The application should handle importing and processing CSV files with several thousand transactions within a reasonable time (e.g., under 30 seconds for 5000 transactions).
    *   UI interactions (filtering, sorting, viewing) should be responsive.
    *   Analysis generation (both charts and AI) should provide visual feedback if processing takes more than a few seconds.
*   **NFR3. Security:**
    *   The Gemini API key must be stored securely using OS-level credential management facilities (e.g., Keychain on macOS, Credential Manager on Windows, Keyring on Linux).
    *   No sensitive financial data (raw transactions) should be persisted outside the user's local machine by the application. Data sent to Gemini must be limited to what's necessary for the feature (description for categorization, aggregated summaries for analysis).
*   **NFR4. Usability:**
    *   The application should have a clean, intuitive, and easy-to-navigate user interface.
    *   Clear feedback should be provided during potentially long operations (import, AI analysis).
    *   Error handling should be user-friendly (e.g., clear messages for invalid CSV formats, API connection errors).
*   **NFR5. Offline Capability:** All core features *except* AI-assisted categorization (FR3.4) and AI-powered analysis (FR5.3) must function fully without an internet connection. The application should clearly indicate when internet is required for specific actions.

**6. Design & UX Considerations**

*   Maintain a clear visual distinction between locally processed data/charts and AI-generated insights.
*   Make the process of confirming/correcting AI category suggestions seamless.
*   Ensure charts are clear, readable, and interactive (e.g., tooltips showing values).
*   Provide easy access to filtering controls.

**7. API/External Service Requirements**

*   **Google Gemini API:**
    *   Requires an API key provided by the user.
    *   Used for:
        *   Suggesting categories based on transaction descriptions.
        *   Providing textual analysis of spending patterns (focused on savings and anomalies) based on aggregated data.
    *   Application must handle API errors gracefully (e.g., network issues, invalid key, rate limits).

**8. Future Considerations / Out of Scope (Version 1.0)**

*   Direct bank account linking (e.g., using Plaid).
*   Budgeting features (setting spending goals per category).
*   Multi-currency support.
*   Investment tracking.
*   Advanced reporting and custom report creation.
*   Mobile versions.
*   Optional cloud backup/sync features.
*   More sophisticated rule creation logic (e.g., using regular expressions).

**9. Success Metrics**

*   User successfully imports and maps CSV data from their bank(s).
*   High percentage of transactions categorized (manually or automatically).
*   User actively uses filtering and reporting features.
*   User utilizes the AI categorization and analysis features.
*   Low rate of errors during import and processing.
*   Positive qualitative feedback on usability and usefulness.

**10. Open Questions**

*   Specific error handling strategy for different CSV parsing issues (e.g., missing columns, invalid data types)?
*   Exact format/structure of data sent to Gemini for analysis to maximize insight quality while minimizing data exposure?
*   Preferred charting library?
*   Detailed requirements for handling different currency formats and decimal separators during import?

---

This PRD should provide a solid foundation for developing your Local Ledger application. Remember to revisit and update it as development progresses and new insights emerge.