const express = require('express');
const mysql = require('mysql2/promise');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.diskStorage({
  destination: './public/Uploads',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
});

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'HiThere@2000',
  database: 'aerb_db',
};

const pool = mysql.createPool({ ...dbConfig, waitForConnections: true, connectionLimit: 10 });

async function initializeDatabase() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
    });

    await connection.query('CREATE DATABASE IF NOT EXISTS aerb_db');
    await connection.query('USE aerb_db');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS divisions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        abbreviation VARCHAR(10) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        sequence INT NOT NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS sections (
        id INT PRIMARY KEY AUTO_INCREMENT,
        division_id INT NOT NULL,
        abbreviation VARCHAR(10) NOT NULL,
        name VARCHAR(100) NOT NULL,
        sequence INT NOT NULL,
        FOREIGN KEY (division_id) REFERENCES divisions(id),
        UNIQUE(division_id, abbreviation)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS procedures (
        id INT PRIMARY KEY AUTO_INCREMENT,
        abbreviation VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        sequence INT NOT NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS topics (
        id INT PRIMARY KEY AUTO_INCREMENT,
        procedure_id INT NOT NULL,
        abbreviation VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        sequence INT NOT NULL,
        FOREIGN KEY (procedure_id) REFERENCES procedures(id),
        UNIQUE(procedure_id, abbreviation)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS subtopics (
        id INT PRIMARY KEY AUTO_INCREMENT,
        topic_id INT NOT NULL,
        abbreviation VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        sequence INT NOT NULL,
        FOREIGN KEY (topic_id) REFERENCES topics(id),
        UNIQUE(topic_id, abbreviation)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS emp (
        id INT PRIMARY KEY AUTO_INCREMENT,
        EmpCode VARCHAR(10) NOT NULL UNIQUE,
        EmpName VARCHAR(100) NOT NULL,
        Designation VARCHAR(50),
        role VARCHAR(10),
        Email VARCHAR(100),
        Division VARCHAR(10) NOT NULL,
        Section VARCHAR(10) NOT NULL,
        DOB DATE,
        status CHAR(1),
        intercom VARCHAR(10),
        mobile VARCHAR(15),
        residence_no VARCHAR(15)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS counters (
        name VARCHAR(255) PRIMARY KEY,
        value INT NOT NULL
      )
    `);

    await connection.query(
      'INSERT IGNORE INTO counters (name, value) VALUES (?, ?)',
      ['ack_number', 100000]
    );

    await connection.query(`
      CREATE TABLE IF NOT EXISTS inward_numbers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        year VARCHAR(4) NOT NULL,
        count INT DEFAULT 0,
        UNIQUE (year)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS inward_documents (
        id INT PRIMARY KEY AUTO_INCREMENT,
        inward_number VARCHAR(255) NOT NULL,
        reference_number VARCHAR(50) NOT NULL,
        subject VARCHAR(100) NOT NULL,
        language ENUM('Hindi', 'English', 'Bilingual', 'Other') NOT NULL,
        date_as_per_document DATE NOT NULL,
        inward_type ENUM('With ACK', 'Without ACK') NOT NULL,
        ack_number VARCHAR(6),
        submission_type ENUM('Soft Copy', 'Hard Copy') NOT NULL,
        document_path VARCHAR(255),
        sender_within_aerb BOOLEAN NOT NULL,
        sender_division VARCHAR(10),
        sender_section VARCHAR(10),
        sender_name VARCHAR(100) NOT NULL,
        sender_email VARCHAR(100) NOT NULL,
        sender_type ENUM('CentralGovt', 'StateGovt', 'PrivateOrg', 'Individual') NOT NULL,
        pincode VARCHAR(6),
        city VARCHAR(100),
        state VARCHAR(100),
        region ENUM('A', 'B', 'C', 'D'),
        country VARCHAR(100),
        receiving_division VARCHAR(10) NOT NULL,
        receiving_section VARCHAR(10) NOT NULL,
        receiver VARCHAR(100) NOT NULL,
        next_action_by VARCHAR(100) NOT NULL,
        reply_expected BOOLEAN NOT NULL,
        procedures VARCHAR(50),
        topic VARCHAR(50),
        subtopic VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS outward_documents (
        id INT PRIMARY KEY AUTO_INCREMENT,
        outward_number VARCHAR(50) NOT NULL UNIQUE,
        inward_id INT,
        reference VARCHAR(100) NOT NULL,
        subject VARCHAR(100) NOT NULL,
        procedure_name VARCHAR(100),
        language ENUM('Hindi', 'English', 'Bilingual', 'Other') NOT NULL,
        recipient VARCHAR(100) NOT NULL,
        organization VARCHAR(100) NOT NULL,
        pincode VARCHAR(6) NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        region ENUM('A', 'B', 'C', 'D') NOT NULL,
        country VARCHAR(100) NOT NULL,
        addressedTo ENUM('CentralGovt', 'StateGovt', 'PrivateOrg', 'Citizen', 'Other') NOT NULL,
        sender VARCHAR(100) NOT NULL,
        division VARCHAR(10) NOT NULL,
        section VARCHAR(10) NOT NULL,
        procedures VARCHAR(50) NOT NULL,
        topic VARCHAR(50) NOT NULL,
        subtopic VARCHAR(50) NOT NULL,
        date_sent DATE NOT NULL,
        submission_type ENUM('Soft Copy', 'Hard Copy') NOT NULL,
        hard_copies INT,
        document_path VARCHAR(255),
        cc_recipients JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (inward_id) REFERENCES inward_documents(id)
      )
    `);

    const divisions = [
      { abbreviation: 'OPSD', name: 'Operating Plant Safety Division', sequence: 1 },
      { abbreviation: 'NPSD', name: 'Nuclear Projects Safety Division', sequence: 2 },
      { abbreviation: 'RASD', name: 'Radiation Applications Safety Division', sequence: 3 },
      { abbreviation: 'NSAD', name: 'Nuclear Safety Analysis Division', sequence: 4 },
      { abbreviation: 'ITRDD', name: 'Information Technology and Regulatory Documents Division', sequence: 5 },
      { abbreviation: 'DRI', name: 'Division of Regulatory Inspection', sequence: 6 },
      { abbreviation: 'DRAER', name: 'Directorate of Regulatory Affairs & External Relations', sequence: 7 },
      { abbreviation: 'DRPE', name: 'Division of Radiation Protection', sequence: 8 },
      { abbreviation: 'SRI', name: 'Safety Research Institute', sequence: 9 },
      { abbreviation: 'RRC', name: 'Regional Regulatory Center', sequence: 10 },
    ];

    await connection.query(
      'INSERT IGNORE INTO divisions (abbreviation, name, sequence) VALUES ?',
      [divisions.map(d => [d.abbreviation, d.name, d.sequence])]
    );

    const sections = [
      { division: 'OPSD', abbreviation: 'SRS', name: 'Safety Review Section', sequence: 1 },
      { division: 'OPSD', abbreviation: 'OCS', name: 'Operational Compliance Section', sequence: 2 },
      { division: 'NPSD', abbreviation: 'PAS', name: 'Project Assessment Section', sequence: 1 },
      { division: 'NPSD', abbreviation: 'DSS', name: 'Design Safety Section', sequence: 2 },
      { division: 'RASD', abbreviation: 'RSS', name: 'Radiation Safety Section', sequence: 1 },
      { division: 'RASD', abbreviation: 'ACS', name: 'Application Compliance Section', sequence: 2 },
      { division: 'NSAD', abbreviation: 'ANS', name: 'Analysis Section', sequence: 1 },
      { division: 'NSAD', abbreviation: 'SIMS', name: 'Simulation Section', sequence: 2 },
      { division: 'ITRDD', abbreviation: 'ITS', name: 'IT Section', sequence: 1 },
      { division: 'ITRDD', abbreviation: 'RDS', name: 'Regulatory Docs', sequence: 2 },
      { division: 'DRI', abbreviation: 'INS', name: 'Inspection Section', sequence: 1 },
      { division: 'DRI', abbreviation: 'CS', name: 'Compliance Section', sequence: 2 },
      { division: 'DRAER', abbreviation: 'AFS', name: 'Affairs Section', sequence: 1 },
      { division: 'DRAER', abbreviation: 'ERS', name: 'External Relations Section', sequence: 2 },
      { division: 'DRPE', abbreviation: 'RPS', name: 'Radiation Protection Section', sequence: 1 },
      { division: 'DRPE', abbreviation: 'ES', name: 'Environment Section', sequence: 2 },
      { division: 'SRI', abbreviation: 'RS', name: 'Research Section', sequence: 1 },
      { division: 'SRI', abbreviation: 'IS', name: 'Innovation Section', sequence: 2 },
      { division: 'RRC', abbreviation: 'REGS', name: 'Regional Section', sequence: 1 },
      { division: 'RRC', abbreviation: 'MS', name: 'Monitoring Section', sequence: 2 },
    ];

    for (const sec of sections) {
      const [divisionResult] = await connection.query(
        'SELECT id FROM divisions WHERE abbreviation = ?',
        [sec.division]
      );
      if (!divisionResult[0]) {
        throw new Error(`Division ${sec.division} not found`);
      }
      await connection.query(
        'INSERT IGNORE INTO sections (division_id, abbreviation, name, sequence) VALUES (?, ?, ?, ?)',
        [divisionResult[0].id, sec.abbreviation, sec.name, sec.sequence]
      );
    }

    const procedures = [
      { abbreviation: 'REGDOC', name: 'Regulatory Documents', sequence: 1 },
      { abbreviation: 'RMS', name: 'Resource Management System', sequence: 2 },
      { abbreviation: 'ITSS', name: 'IT Support Services', sequence: 3 },
      { abbreviation: 'RALP', name: 'Review, Assessment for Licensing Process', sequence: 4 },
      { abbreviation: 'RI', name: 'Regulatory Inspections', sequence: 5 },
      { abbreviation: 'SWNT', name: 'Seminars/Workshops/NCRI Training', sequence: 6 },
      { abbreviation: 'FM', name: 'Financial Matters', sequence: 7 },
      { abbreviation: 'AM', name: 'Administrative Matters', sequence: 8 },
      { abbreviation: 'MM', name: 'Management Matters', sequence: 9 },
    ];

    await connection.query(
      'INSERT IGNORE INTO procedures (abbreviation, name, sequence) VALUES ?',
      [procedures.map(p => [p.abbreviation, p.name, p.sequence])]
    );

    const topics = [
      { procedure: 'REGDOC', abbreviation: 'SAF', name: 'Safety', sequence: 1 },
      { procedure: 'REGDOC', abbreviation: 'SEC', name: 'Security', sequence: 2 },
      { procedure: 'RMS', abbreviation: 'CIV', name: 'Civil', sequence: 1 },
      { procedure: 'RMS', abbreviation: 'ELE', name: 'Electrical/Rooftop Solar PV system', sequence: 2 },
      { procedure: 'RMS', abbreviation: 'MEC', name: 'Mechanical', sequence: 3 },
      { procedure: 'RMS', abbreviation: 'TEL', name: 'Telephone', sequence: 4 },
      { procedure: 'ITSS', abbreviation: 'IT', name: 'IT', sequence: 1 },
      { procedure: 'RALP', abbreviation: 'SAFR', name: 'Safety Review', sequence: 1 },
      { procedure: 'RALP', abbreviation: 'SECR', name: 'Security Review', sequence: 2 },
      { procedure: 'RI', abbreviation: 'SAFI', name: 'Safety Inspection', sequence: 1 },
      { procedure: 'RI', abbreviation: 'SECI', name: 'Security Inspection', sequence: 2 },
      { procedure: 'SWNT', abbreviation: 'GRA', name: 'Grants', sequence: 1 },
      { procedure: 'SWNT', abbreviation: 'PROG', name: 'Programmes/Participation Deputation', sequence: 2 },
      { procedure: 'FM', abbreviation: 'REV', name: 'Revenue Budget', sequence: 1 },
      { procedure: 'FM', abbreviation: 'CAP', name: 'Capital Projects Budget', sequence: 2 },
      { procedure: 'FM', abbreviation: 'AMC', name: 'AMCS/License', sequence: 3 },
      { procedure: 'FM', abbreviation: 'TRV', name: 'Travels', sequence: 4 },
      { procedure: 'AM', abbreviation: 'OLI', name: 'Official Language Implementation (OLI)', sequence: 1 },
      { procedure: 'AM', abbreviation: 'ORD', name: 'Office Orders', sequence: 2 },
      { procedure: 'AM', abbreviation: 'HR', name: 'Human Resources/APAR, Promotions, etc.', sequence: 3 },
      { procedure: 'AM', abbreviation: 'VIG', name: 'Vigilance', sequence: 4 },
      { procedure: 'AM', abbreviation: 'CON', name: 'Consultants related', sequence: 5 },
      { procedure: 'AM', abbreviation: 'EXT', name: 'External (MoU)', sequence: 6 },
      { procedure: 'AM', abbreviation: 'PAR', name: 'Parliament Question', sequence: 7 },
      { procedure: 'AM', abbreviation: 'FIR', name: 'Fire Order', sequence: 8 },
      { procedure: 'AM', abbreviation: 'RTI', name: 'RTI', sequence: 9 },
      { procedure: 'AM', abbreviation: 'AUD', name: 'Audit (CAG, DAE-IW, PAC)', sequence: 10 },
      { procedure: 'AM', abbreviation: 'SP', name: 'Special Programmes (AERB Day, Cyber Security Awareness etc.)', sequence: 11 },
      { procedure: 'AM', abbreviation: 'FDB', name: 'Feedback', sequence: 12 },
      { procedure: 'AM', abbreviation: 'OTH', name: 'Others (Seating Arrangement, Medical Exams, TLDs etc.)', sequence: 13 },
      { procedure: 'MM', abbreviation: 'IMS', name: 'IMS', sequence: 1 },
      { procedure: 'MM', abbreviation: 'AUDM', name: 'Audits', sequence: 2 },
      { procedure: 'MM', abbreviation: 'MR', name: 'Monthly Report', sequence: 3 },
      { procedure: 'MM', abbreviation: 'QR', name: 'Quarterly Report', sequence: 4 },
      { procedure: 'MM', abbreviation: 'AR', name: 'Annual Report', sequence: 5 },
      { procedure: 'MM', abbreviation: 'NL', name: 'News Letter', sequence: 6 },
      { procedure: 'MM', abbreviation: 'DM', name: 'Divisional Meeting', sequence: 7 },
      { procedure: 'MM', abbreviation: 'EC', name: 'EC-SCS/EC Meeting', sequence: 8 },
      { procedure: 'MM', abbreviation: 'PRCM', name: 'PRCM', sequence: 9 },
      { procedure: 'MM', abbreviation: 'SMM', name: 'Sr. Management Meeting', sequence: 10 },
      { procedure: 'MM', abbreviation: 'BM', name: 'Board Meeting', sequence: 11 },
    ];

    for (const t of topics) {
      const [procedureResult] = await connection.query(
        'SELECT id FROM procedures WHERE abbreviation = ?',
        [t.procedure]
      );
      if (!procedureResult[0]) {
        throw new Error(`Procedure ${t.procedure} not found`);
      }
      await connection.query(
        'INSERT IGNORE INTO topics (procedure_id, abbreviation, name, sequence) VALUES (?, ?, ?, ?)',
        [procedureResult[0].id, t.abbreviation, t.name, t.sequence]
      );
    }

    const subtopics = [
      { procedure: 'REGDOC', topic: 'SAF', abbreviation: 'AERB', name: 'AERB', sequence: 1 },
      { procedure: 'REGDOC', topic: 'SAF', abbreviation: 'IAEA', name: 'IAEA Safety Standards', sequence: 2 },
      { procedure: 'REGDOC', topic: 'SAF', abbreviation: 'OTH', name: 'Others', sequence: 3 },
      { procedure: 'REGDOC', topic: 'SEC', abbreviation: 'AERB', name: 'AERB', sequence: 1 },
      { procedure: 'REGDOC', topic: 'SEC', abbreviation: 'IAEA', name: 'IAEA Safety Standards', sequence: 2 },
      { procedure: 'REGDOC', topic: 'SEC', abbreviation: 'OTH', name: 'Others', sequence: 3 },
      { procedure: 'REGDOC', topic: 'SAF', abbreviation: 'INT', name: 'Internal', sequence: 4 },
      { procedure: 'REGDOC', topic: 'SEC', abbreviation: 'INT', name: 'Internal', sequence: 4 },
      { procedure: 'RMS', topic: 'CIV', abbreviation: 'MOD', name: 'Modification', sequence: 1 },
      { procedure: 'RMS', topic: 'CIV', abbreviation: 'SRV', name: 'Services', sequence: 2 },
      { procedure: 'RMS', topic: 'CIV', abbreviation: 'OTH', name: 'Others Letters/Orders', sequence: 3 },
      { procedure: 'RMS', topic: 'CIV', abbreviation: 'MOM', name: 'MoMs/100s', sequence: 4 },
      { procedure: 'RMS', topic: 'ELE', abbreviation: 'MOD', name: 'Modification', sequence: 1 },
      { procedure: 'RMS', topic: 'ELE', abbreviation: 'SRV', name: 'Services', sequence: 2 },
      { procedure: 'RMS', topic: 'ELE', abbreviation: 'OTH', name: 'Others Letters/Orders', sequence: 3 },
      { procedure: 'RMS', topic: 'ELE', abbreviation: 'MOM', name: 'MoMs/100s', sequence: 4 },
      { procedure: 'RMS', topic: 'MEC', abbreviation: 'MOD', name: 'Modification', sequence: 1 },
      { procedure: 'RMS', topic: 'MEC', abbreviation: 'SRV', name: 'Services', sequence: 2 },
      { procedure: 'RMS', topic: 'MEC', abbreviation: 'OTH', name: 'Others Letters/Orders', sequence: 3 },
      { procedure: 'RMS', topic: 'MEC', abbreviation: 'MOM', name: 'MoMs/100s', sequence: 4 },
      { procedure: 'RMS', topic: 'TEL', abbreviation: 'MOD', name: 'Modification', sequence: 1 },
      { procedure: 'RMS', topic: 'TEL', abbreviation: 'SRV', name: 'Services', sequence: 2 },
      { procedure: 'RMS', topic: 'TEL', abbreviation: 'OTH', name: 'Others Letters/Orders', sequence: 3 },
      { procedure: 'RMS', topic: 'TEL', abbreviation: 'MOM', name: 'MoMs/100s', sequence: 4 },
      { procedure: 'ITSS', topic: 'IT', abbreviation: 'HW', name: 'Hardware', sequence: 1 },
      { procedure: 'ITSS', topic: 'IT', abbreviation: 'SW', name: 'Software', sequence: 2 },
      { procedure: 'ITSS', topic: 'IT', abbreviation: 'SRV', name: 'Services (AMCS, License)', sequence: 3 },
      { procedure: 'RALP', topic: 'SAFR', abbreviation: 'OPF', name: 'Operating Facilities', sequence: 1 },
      { procedure: 'RALP', topic: 'SAFR', abbreviation: 'NFP', name: 'NF Projects', sequence: 2 },
      { procedure: 'RALP', topic: 'SAFR', abbreviation: 'RF', name: 'Radiation Facilities', sequence: 3 },
      { procedure: 'RALP', topic: 'SECR', abbreviation: 'OPF', name: 'Operating Facilities', sequence: 1 },
      { procedure: 'RALP', topic: 'SECR', abbreviation: 'NFP', name: 'NF Projects', sequence: 2 },
      { procedure: 'RALP', topic: 'SECR', abbreviation: 'RF', name: 'Radiation Facilities', sequence: 3 },
      { procedure: 'RI', topic: 'SAFI', abbreviation: 'OPF', name: 'Operating Facilities', sequence: 1 },
      { procedure: 'RI', topic: 'SAFI', abbreviation: 'NFP', name: 'NF Projects', sequence: 2 },
      { procedure: 'RI', topic: 'SAFI', abbreviation: 'RF', name: 'Radiation Facilities', sequence: 3 },
      { procedure: 'RI', topic: 'SECI', abbreviation: 'OPF', name: 'Operating Facilities', sequence: 1 },
      { procedure: 'RI', topic: 'SECI', abbreviation: 'NFP', name: 'NF Projects', sequence: 2 },
      { procedure: 'RI', topic: 'SECI', abbreviation: 'RF', name: 'Radiation Facilities', sequence: 3 },
      { procedure: 'SWNT', topic: 'PROG', abbreviation: 'NAT', name: 'National', sequence: 1 },
      { procedure: 'SWNT', topic: 'PROG', abbreviation: 'INT', name: 'International (CMS, TMs etc.)', sequence: 2 },
      { procedure: 'FM', topic: 'CAP', abbreviation: 'ICT', name: 'ICT', sequence: 1 },
      { procedure: 'FM', topic: 'CAP', abbreviation: 'BS', name: 'Building & Structures', sequence: 2 },
      { procedure: 'FM', topic: 'CAP', abbreviation: 'FF', name: 'Furniture & Fixtures', sequence: 3 },
      { procedure: 'MM', topic: 'IMS', abbreviation: 'PRIS', name: 'PRIS-G', sequence: 1 },
      { procedure: 'MM', topic: 'AUDM', abbreviation: 'PRIS', name: 'PRIS-G', sequence: 1 },
      { procedure: 'MM', topic: 'MR', abbreviation: 'PRIS', name: 'PRIS-G', sequence: 1 },
      { procedure: 'MM', topic: 'QR', abbreviation: 'PRIS', name: 'PRIS-G', sequence: 1 },
      { procedure: 'MM', topic: 'AR', abbreviation: 'PRIS', name: 'PRIS-G', sequence: 1 },
      { procedure: 'MM', topic: 'NL', abbreviation: 'PRIS', name: 'PRIS-G', sequence: 1 },
      { procedure: 'MM', topic: 'DM', abbreviation: 'PRIS', name: 'PRIS-G', sequence: 1 },
      { procedure: 'MM', topic: 'EC', abbreviation: 'PRIS', name: 'PRIS-G', sequence: 1 },
      { procedure: 'MM', topic: 'PRCM', abbreviation: 'PRIS', name: 'PRIS-G', sequence: 1 },
      { procedure: 'MM', topic: 'SMM', abbreviation: 'PRIS', name: 'PRIS-G', sequence: 1 },
      { procedure: 'MM', topic: 'BM', abbreviation: 'PRIS', name: 'PRIS-G', sequence: 1 },
    ];

    for (const st of subtopics) {
      const [topicResult] = await connection.query(
        'SELECT t.id FROM topics t JOIN procedures p ON t.procedure_id = p.id WHERE t.abbreviation = ? AND p.abbreviation = ?',
        [st.topic, st.procedure]
      );
      if (!topicResult[0]) {
        throw new Error(`Topic ${st.topic} not found for procedure ${st.procedure}`);
      }
      await connection.query(
        'INSERT IGNORE INTO subtopics (topic_id, abbreviation, name, sequence) VALUES (?, ?, ?, ?)',
        [topicResult[0].id, st.abbreviation, st.name, st.sequence]
      );
    }

    const employees = [
      { EmpCode: '1001', EmpName: 'John Doe', Designation: 'SOH', role: 'SOH', Email: 'john.doe@example.com', Division: 'OPSD', Section: 'SRS', DOB: '1990-01-01', status: 'A', intercom: '1001', mobile: '9876543210', residence_no: '221234567' },
      { EmpCode: '1002', EmpName: 'Amit Sharma', Designation: 'SOF', role: 'SOF', Email: 'amit.sharma@example.com', Division: 'OPSD', Section: 'OCS', DOB: '1985-05-15', status: 'A', intercom: '1002', mobile: '9876543211', residence_no: '221234568' },
      { EmpCode: '1003', EmpName: 'Priya Patel', Designation: 'SOG', role: 'MGR', Email: 'priya.patel@example.com', Division: 'NPSD', Section: 'PAS', DOB: '1988-03-20', status: 'A', intercom: '1003', mobile: '9876543212', residence_no: '221234569' },
      { EmpCode: '1004', EmpName: 'Rahul Verma', Designation: 'SOH', role: 'ANA', Email: 'rahul.verma@example.com', Division: 'NPSD', Section: 'DSS', DOB: '1992-07-10', status: 'A', intercom: '1004', mobile: '9876543213', residence_no: '221234570' },
      { EmpCode: '1005', EmpName: 'Neha Gupta', Designation: 'SOF', role: 'SCI', Email: 'neha.gupta@example.com', Division: 'RASD', Section: 'RSS', DOB: '1990-11-25', status: 'A', intercom: '1005', mobile: '9876543214', residence_no: '221234571' },
      { EmpCode: '1006', EmpName: 'Anup Shinde', Designation: 'SOH', role: 'SOH', Email: 'anup.shinde@example.com', Division: 'OPSD', Section: 'SRS', DOB: '1987-09-12', status: 'A', intercom: '1006', mobile: '9876543215', residence_no: '221234572' },
    ];

    await connection.query(
      'INSERT IGNORE INTO emp (EmpCode, EmpName, Designation, role, Email, Division, Section, DOB, status, intercom, mobile, residence_no) VALUES ?',
      [employees.map(e => [e.EmpCode, e.EmpName, e.Designation, e.role, e.Email, e.Division, e.Section, e.DOB, e.status, e.intercom, e.mobile, e.residence_no])]
    );

    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Database initialization failed:', err);
    throw err;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function watermarkPDF(inputPath, number, outputPath) {
  try {
    console.log('Watermarking PDF:', { inputPath, outputPath, number });
    const pdfBytes = await fs.readFile(inputPath);
    console.log('PDF read successfully, size:', pdfBytes.length);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    console.log('PDF loaded successfully');
    const pages = pdfDoc.getPages();
    if (!pages.length) throw new Error('No pages in PDF');
    const firstPage = pages[0];
    firstPage.drawText(number, {
      x: 50,
      y: firstPage.getHeight() - 50,
      size: 15,
      opacity: 0.5,
    });
    const pdfBytesWatermarked = await pdfDoc.save();
    await fs.writeFile(outputPath, pdfBytesWatermarked);
    console.log('PDF watermarked and saved');
  } catch (error) {
    console.error('Watermark Error:', error.message, error.stack);
    throw error;
  }
}

async function generateInwardNumber(division, section, procedures, topic, subtopic) {
  try {
    console.log('Generating inward number for:', { division, section, procedures, topic, subtopic, year: new Date().getFullYear() });
    const [results] = await pool.query(
      `SELECT d.sequence AS div_seq, s.sequence AS sec_seq, p.sequence AS proc_seq, t.sequence AS topic_seq, st.sequence AS subtopic_seq
       FROM divisions d
       LEFT JOIN sections s ON d.id = s.division_id AND s.abbreviation = ?
       LEFT JOIN procedures p ON p.abbreviation = ?
       LEFT JOIN topics t ON p.id = t.procedure_id AND t.abbreviation = ?
       LEFT JOIN subtopics st ON t.id = st.topic_id AND st.abbreviation = ?
       WHERE d.abbreviation = ?`,
      [section, procedures || 'UNKNOWN', topic || 'UNKNOWN', subtopic || 'UNKNOWN', division]
    );

    if (!results[0]) {
      throw new Error('Invalid division/section/procedures/topic/subtopic combination');
    }

    const { div_seq, sec_seq, proc_seq, topic_seq, subtopic_seq } = results[0];
    if (div_seq == null || sec_seq == null || proc_seq == null || topic_seq == null || subtopic_seq == null) {
      throw new Error('Missing sequence for division/section/procedures/topic/subtopic');
    }

    const encoded = `${div_seq}${sec_seq}${proc_seq}${topic_seq}${subtopic_seq}`;
    const year = new Date().getFullYear();
    const prefix = `AERB/${division}/${section}/${encoded}/${year}/`;

    const [countResults] = await pool.query(
      `SELECT COUNT(*) as count FROM inward_documents WHERE inward_number LIKE ?`,
      [`${prefix}%`]
    );

    const sequence = String(countResults[0].count + 1).padStart(3, '0');
    const inwardNumber = `${prefix}${sequence}`;
    return inwardNumber;
  } catch (err) {
    console.error('Error in generateInwardNumber:', err.message, err.stack);
    throw err;
  }
}

async function generateOutwardNumber(division, section, procedures, topic, subtopic) {
  try {
    const year = new Date().getFullYear();
    const [results] = await pool.query(
      `SELECT d.sequence AS div_seq, s.sequence AS sec_seq, p.sequence AS proc_seq, t.sequence AS topic_seq, st.sequence AS subtopic_seq
       FROM divisions d
       LEFT JOIN sections s ON d.id = s.division_id AND s.abbreviation = ?
       LEFT JOIN procedures p ON p.abbreviation = ?
       LEFT JOIN topics t ON p.id = t.procedure_id AND t.abbreviation = ?
       LEFT JOIN subtopics st ON t.id = st.topic_id AND st.abbreviation = ?
       WHERE d.abbreviation = ?`,
      [section, procedures, topic, subtopic, division]
    );

    if (!results[0]) {
      throw new Error('Invalid division/section/procedures/topic/subtopic');
    }

    const { div_seq, sec_seq, proc_seq, topic_seq, subtopic_seq } = results[0];
    if (div_seq == null || sec_seq == null || proc_seq == null || topic_seq == null || subtopic_seq == null) {
      throw new Error('Missing sequence for division/section/procedures/topic/subtopic');
    }

    const encoded = `${div_seq}${sec_seq}${proc_seq}${topic_seq}${subtopic_seq}`;
    const prefix = `AERB/${division}/${section}/${procedures}/${topic}/${subtopic}/${encoded}/${year}/`;

    const [countResults] = await pool.query(
      `SELECT COUNT(*) as count FROM outward_documents WHERE outward_number LIKE ?`,
      [`${prefix}%`]
    );

    const sequence = String(countResults[0].count + 1).padStart(3, '0');
    return `${prefix}${sequence}`;
  } catch (err) {
    console.error('Error generating outward number:', err);
    throw err;
  }
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/api/report', (req, res) => {
  const filePath = path.join(__dirname, '../public/report.html');
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error sending file:', err);
      res.status(404).send('Report page not found');
    }
  });
});

app.get('/api/divisions', async (req, res) => {
  try {
    const [results] = await pool.query('SELECT abbreviation, name FROM divisions ORDER BY sequence');
    res.json(results);
  } catch (err) {
    console.error('Database error in /api/divisions:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/sections', async (req, res) => {
  const division = req.query.division;
  if (!division) return res.status(400).json({ message: 'Division required' });
  try {
    const [results] = await pool.query(
      `SELECT s.abbreviation, s.name 
       FROM sections s 
       JOIN divisions d ON s.division_id = d.id 
       WHERE d.abbreviation = ? 
       ORDER BY s.sequence`,
      [division]
    );
    res.json(results);
  } catch (err) {
    console.error('Database error in /api/sections:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/procedures', async (req, res) => {
  try {
    const [results] = await pool.query('SELECT abbreviation, name FROM procedures ORDER BY sequence');
    res.json(results);
  } catch (err) {
    console.error('Database error in /api/procedures:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/topics', async (req, res) => {
  const procedure = req.query.procedure;
  if (!procedure) return res.status(400).json({ message: 'Procedure required' });
  try {
    const [results] = await pool.query(
      `SELECT t.abbreviation, t.name 
       FROM topics t 
       JOIN procedures p ON t.procedure_id = p.id 
       WHERE p.abbreviation = ? 
       ORDER BY t.sequence`,
      [procedure]
    );
    res.json(results);
  } catch (err) {
    console.error('Database error in /api/topics:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/subtopics', async (req, res) => {
  const topic = req.query.topic;
  if (!topic) return res.status(400).json({ message: 'Topic required' });
  try {
    const [results] = await pool.query(
      `SELECT st.abbreviation, st.name 
       FROM subtopics st 
       JOIN topics t ON st.topic_id = t.id 
       WHERE t.abbreviation = ? 
       ORDER BY st.sequence`,
      [topic]
    );
    res.json(results);
  } catch (err) {
    console.error('Database error in /api/subtopics:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/employees', async (req, res) => {
  const { division, section } = req.query;
  if (!division || !section) {
    console.error('Missing division or section:', { division, section });
    return res.status(400).json({ message: 'Division and section required' });
  }
  try {
    const [results] = await pool.query(
      'SELECT EmpName, Email FROM emp WHERE Division = ? AND Section = ? AND status = "A" ORDER BY EmpName',
      [division, section]
    );
    res.json(results);
  } catch (err) {
    console.error(`Error fetching employees for Division=${division}, Section=${section}:`, err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

app.get('/api/allemp', async (req, res) => {
  try {
    let query = 'SELECT EmpName, EmpCode, Email, Division, Section FROM emp WHERE status = "A"';
    const params = [];
    const { search } = req.query;
    if (search) {
      query += ' AND (EmpName LIKE ? OR EmpCode LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY EmpName';
    const [results] = await pool.query(query, params);
    res.json(results);
  } catch (err) {
    console.error('Error fetching all employees:', err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

app.get('/api/getack', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT `value` FROM counters WHERE name='ack_number'");
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Ack number not found' });
    }
    res.json({ ack_number: rows[0].value });
  } catch (err) {
    console.error('Error fetching ack number:', err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

app.get('/api/states-regions', async (req, res) => {
  try {
    const statesRegions = [
      { state: 'Andaman and Nicobar Islands', region: 'D' },
      { state: 'Andhra Pradesh', region: 'C' },
      { state: 'Arunachal Pradesh', region: 'A' },
      { state: 'Assam', region: 'A' },
      { state: 'Bihar', region: 'A' },
      { state: 'Chandigarh', region: 'A' },
      { state: 'Chhattisgarh', region: 'B' },
      { state: 'Dadra and Nagar Haveli and Daman and Diu', region: 'B' },
      { state: 'Delhi', region: 'A' },
      { state: 'Goa', region: 'B' },
      { state: 'Gujarat', region: 'B' },
      { state: 'Haryana', region: 'A' },
      { state: 'Himachal Pradesh', region: 'A' },
      { state: 'Jammu and Kashmir', region: 'A' },
      { state: 'Jharkhand', region: 'A' },
      { state: 'Karnataka', region: 'C' },
      { state: 'Kerala', region: 'C' },
      { state: 'Ladakh', region: 'A' },
      { state: 'Lakshadweep', region: 'D' },
      { state: 'Madhya Pradesh', region: 'B' },
      { state: 'Maharashtra', region: 'B' },
      { state: 'Manipur', region: 'A' },
      { state: 'Meghalaya', region: 'A' },
      { state: 'Mizoram', region: 'A' },
      { state: 'Nagaland', region: 'A' },
      { state: 'Odisha', region: 'C' },
      { state: 'Puducherry', region: 'C' },
      { state: 'Punjab', region: 'A' },
      { state: 'Rajasthan', region: 'A' },
      { state: 'Sikkim', region: 'A' },
      { state: 'Tamil Nadu', region: 'C' },
      { state: 'Telangana', region: 'C' },
      { state: 'Tripura', region: 'A' },
      { state: 'Uttar Pradesh', region: 'A' },
      { state: 'Uttarakhand', region: 'A' },
      { state: 'West Bengal', region: 'A' },
    ];
    res.json(statesRegions);
  } catch (err) {
    console.error('Error fetching states-regions:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/next-inward-number', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const year = new Date().getFullYear().toString();
    const [results] = await connection.query(
      'SELECT count FROM inward_numbers WHERE year = ? FOR UPDATE',
      [year]
    );

    let nextCount;
    if (results.length === 0) {
      await connection.query(
        'INSERT INTO inward_numbers (year, count) VALUES (?, 1)',
        [year]
      );
      nextCount = 1;
    } else {
      nextCount = results[0].count + 1;
      await connection.query(
        'UPDATE inward_numbers SET count = ? WHERE year = ?',
        [nextCount, year]
      );
    }

    await connection.commit();
    res.json({ inwardNumber: `${year}/${nextCount.toString().padStart(4, '0')}` });
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error fetching inward_number:', err);
    res.status(500).json({ message: 'Database error' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.get('/api/inward-documents', async (req, res) => {
  try {
    const [results] = await pool.query('SELECT * FROM inward_documents ORDER BY created_at DESC');
    res.json(results);
  } catch (err) {
    console.error('Error fetching inward documents:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/outward-documents', async (req, res) => {
  try {
    const [results] = await pool.query('SELECT * FROM outward_documents ORDER BY created_at DESC');
    res.json(results);
  } catch (err) {
    console.error('Error fetching outward documents:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/inward-documents/pending-replies', async (req, res) => {
  try {
    const [results] = await pool.query(
      `SELECT i.*
       FROM inward_documents i
       LEFT JOIN outward_documents o ON i.id = o.inward_id
       WHERE i.reply_expected = 1 AND o.id IS NULL
       ORDER BY i.created_at DESC`
    );
    res.json(results);
  } catch (err) {
    console.error('Error fetching pending replies:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/next-ack-number', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [results] = await connection.query('SELECT value FROM counters WHERE name = "ack_number" FOR UPDATE');
    if (results.length === 0) {
      throw new Error('Acknowledgment counter not initialized');
    }

    const currentAck = results[0].value;
    const nextAck = currentAck;

    await connection.commit();
    res.json({ ackNumber: nextAck.toString().padStart(6, '0') });
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error fetching ack_number:', err);
    res.status(500).json({ message: 'Database error' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.get('/api/report/date-range', async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Start date and end date are required' });
  }

  try {
    const [results] = await pool.query(
      `SELECT inward_number, reference_number, subject, language, sender_name, sender_email, 
              sender_type, pincode, city, state, region, country, receiving_division, 
              receiving_section, receiver, date_as_per_document, 
              submission_type, document_path, created_at, ack_number, sender_within_aerb, 
              next_action_by, reply_expected, procedures, topic, subtopic
       FROM inward_documents
       WHERE date_as_per_document BETWEEN ? AND ?
       ORDER BY date_as_per_document`,
      [startDate, endDate]
    );
    res.json(results);
  } catch (err) {
    console.error('Error fetching date range documents:', err.message, err.stack);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

app.get('/api/report/language-stats', async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Start date and end date are required' });
  }

  try {
    const [results] = await pool.query(
      `SELECT 
        COALESCE(
          CASE 
            WHEN e.Designation IN ('SOH', 'OS') THEN '>=SOH'
            WHEN e.Designation IN ('SOF', 'SOG') THEN '>=SOF <SOH'
            ELSE '<SOF'
          END, '<SOF'
        ) AS designation_category,
        COALESCE(id.language, 'Unknown') AS language,
        COUNT(id.id) as count
      FROM inward_documents id
      LEFT JOIN emp e ON id.sender_name = e.EmpName
      WHERE id.date_as_per_document BETWEEN ? AND ?
      GROUP BY designation_category, id.language
      ORDER BY designation_category, id.language`,
      [startDate, endDate]
    );

    const totals = {};
    results.forEach(row => {
      const category = row.designation_category;
      totals[category] = (totals[category] || 0) + row.count;
    });

    const stats = results.map(row => {
      const category = row.designation_category;
      const percentage = totals[category] ? (row.count * 100.0 / totals[category]).toFixed(2) : 0;
      return {
        designation_category: category,
        language: row.language,
        count: row.count,
        percentage: parseFloat(percentage),
      };
    });

    res.json(stats);
  } catch (err) {
    console.error('Error fetching language stats:', err.message, err.stack);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

app.get('/api/report/receiver-stats', async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Start date and end date are required' });
  }

  try {
    const [results] = await pool.query(
      `SELECT receiver, COUNT(*) as count
       FROM inward_documents
       WHERE date_as_per_document BETWEEN ? AND ?
       GROUP BY receiver`,
      [startDate, endDate]
    );
    res.json(results);
  } catch (err) {
    console.error('Error fetching receiver stats:', err.message, err.stack);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

app.get('/api/report/region-stats', async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Start date and end date are required' });
  }

  try {
    const [results] = await pool.query(
      `SELECT region, COUNT(*) as count
       FROM inward_documents
       WHERE date_as_per_document BETWEEN ? AND ? AND region IN ('A', 'B', 'C', 'D')
       GROUP BY region`,
      [startDate, endDate]
    );
    res.json(results);
  } catch (err) {
    console.error('Error fetching region stats:', err.message, err.stack);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

app.get('/api/report/sender-documents', async (req, res) => {
  const { startDate, endDate, sender } = req.query;
  if (!startDate || !endDate || !sender) {
    return res.status(400).json({ message: 'Start date, end date, and sender are required' });
  }

  try {
    const [results] = await pool.query(
      `SELECT inward_number, reference_number, subject, language, sender_name, sender_email, 
              sender_type, pincode, city, state, region, country, receiving_division, 
              receiving_section, receiver, date_as_per_document, 
              submission_type, document_path, created_at, ack_number, sender_within_aerb, 
              next_action_by, reply_expected, procedures, topic, subtopic
       FROM inward_documents
       WHERE date_as_per_document BETWEEN ? AND ? AND sender_name = ?
       ORDER BY date_as_per_document`,
      [startDate, endDate, sender]
    );
    res.json(results);
  } catch (err) {
    console.error('Error fetching sender documents:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/report/outward-date-range', async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Start date and end date are required' });
  }

  try {
    const [results] = await pool.query(
      `SELECT id, outward_number, inward_id, reference, subject, procedure_name, language, recipient, organization, 
              pincode, city, state, region, country, addressedTo, sender, division, section, 
              procedures, topic, subtopic, date_sent, submission_type, hard_copies, document_path, created_at
       FROM outward_documents
       WHERE date_sent BETWEEN ? AND ?
       ORDER BY date_sent`,
      [startDate, endDate]
    );
    res.json(results);
  } catch (err) {
    console.error('Error retrieving date range:', err);
    res.status(500).json({ message: 'Failed to retrieve date range' });
  }
});

app.get('/api/report/outward-language-stats', async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Start date and end date are required' });
  }

  try {
    const [results] = await pool.query(
      `SELECT 
        CASE 
          WHEN e.Designation IN ('SOH', 'OS') THEN '>=SOH'
          WHEN e.Designation IN ('SOF', 'SOG') THEN '>=SOF <SOH'
          ELSE '<SOF'
        END AS designation_category,
        od.language,
        COUNT(*) as count,
        (COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY 
          CASE 
            WHEN e.Designation IN ('SOH', 'OS') THEN '>=SOH'
            WHEN e.Designation IN ('SOF', 'SOG') THEN '>=SOF <SOH'
            ELSE '<SOF'
          END)) as percentage
      FROM outward_documents od
      JOIN emp e ON od.sender = e.EmpName
      WHERE od.date_sent BETWEEN ? AND ?
      GROUP BY designation_category, od.language
      ORDER BY designation_category, od.language`,
      [startDate, endDate]
    );
    res.json(results);
  } catch (err) {
    console.error('Error fetching language stats:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/report/addressed-to-stats', async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Start date and end date are required' });
  }

  try {
    const [results] = await pool.query(
      `SELECT addressedTo, COUNT(*) as count
       FROM outward_documents
       WHERE date_sent BETWEEN ? AND ?
       GROUP BY addressedTo`,
      [startDate, endDate]
    );
    res.json(results);
  } catch (err) {
    console.error('Error fetching addressedTo stats:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/report/outward-region-stats', async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Start date and end date are required' });
  }

  try {
    const [results] = await pool.query(
      `SELECT region, COUNT(*) as count
       FROM outward_documents
       WHERE date_sent BETWEEN ? AND ? AND region IN ('A', 'B', 'C', 'D')
       GROUP BY region`,
      [startDate, endDate]
    );
    res.json(results);
  } catch (err) {
    console.error('Error fetching region stats:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/report/outward-sender-documents', async (req, res) => {
  const { startDate, endDate, sender } = req.query;
  if (!startDate || !endDate || !sender) {
    return res.status(400).json({ message: 'Start date, end date, and sender are required' });
  }

  try {
    const [results] = await pool.query(
      `SELECT id, outward_number, inward_id, reference, subject, procedure_name, language, recipient, organization, 
              pincode, city, state, region, country, addressedTo, sender, division, section, 
              procedures, topic, subtopic, date_sent, submission_type, hard_copies, document_path, created_at
       FROM outward_documents
       WHERE date_sent BETWEEN ? AND ? AND sender = ?
       ORDER BY date_sent`,
      [startDate, endDate, sender]
    );
    res.json(results);
  } catch (err) {
    console.error('Error fetching sender documents:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/inward-documents/:id', async (req, res) => {
  const inwardId = req.params.id;
  try {
    const [results] = await pool.query(
      'SELECT id, inward_number, reference_number, subject, sender_name, sender_type, pincode, city, state, region, country FROM inward_documents WHERE id = ?',
      [inwardId]
    );
    if (!results[0]) {
      return res.status(404).json({ message: 'Inward document not found' });
    }
    res.json(results[0]);
  } catch (err) {
    console.error('Database error in /api/inward-documents/:id:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/pincode', async (req, res) => {
  const pincode = req.query.pincode;
  if (!pincode || !/^\d{6}$/.test(pincode)) {
    return res.status(400).json({ message: 'Invalid pincode; must be 6 digits' });
  }
  try {
    const response = await fetch(`http://www.postalpincode.in/api/pincode/${pincode}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Pincode API Error:', error);
    return res.status(500).json({ message: 'Failed to fetch pincode data' });
  }
});

app.get('/api/employee-details', async (req, res) => {
  const { name } = req.query;
  if (!name) {
    console.error('Employee name not provided in query');
    return res.status(400).json({ message: 'Employee name is required' });
  }
  try {
    const [results] = await pool.query(
      'SELECT Division, Section, Email FROM emp WHERE EmpName = ? AND status = "A"',
      [name.trim()]
    );
    if (!results[0]) {
      console.warn(`No active employee found for name: ${name}`);
      return res.status(404).json({ message: `No active employee found for name: ${name}` });
    }
    if (!results[0].Division || !results[0].Section) {
      console.warn(`Employee ${name} has incomplete Division or Section:`, results[0]);
      return res.status(400).json({ message: `Employee ${name} has incomplete division or section data` });
    }
    console.log(`Employee details fetched for ${name}:`, results[0]);
    res.json({
      division: results[0].Division,
      section: results[0].Section,
      email: results[0].Email
    });
  } catch (err) {
    console.error(`Error fetching employee details for ${name}:`, err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

app.post('/api/inward-documents', upload.single('document'), async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const {
      referenceNumber, subject, language, dateAsPerDocument, inwardType,
      submissionType, senderWithinAerb, senderDivision, senderSection,
      senderName, senderEmail, senderType, pincode, city, state, region, country,
      receivingDivision, receivingSection, receiver, nextActionBy, replyExpected,
      procedures, topic, subtopic
    } = req.body;

    console.log('Received req.body:', {
  referenceNumber, subject, language, dateAsPerDocument, inwardType,
  submissionType, senderName, senderEmail, senderType,
  receivingDivision, receivingSection, receiver, nextActionBy, replyExpected,
  procedures, topic, subtopic
});

    if (!referenceNumber || !subject || !language || !dateAsPerDocument || !inwardType ||
        !submissionType || !senderName || !senderEmail || !senderType ||
        !receivingDivision || !receivingSection || !receiver || !nextActionBy || replyExpected === undefined) {
      throw new Error('Missing required fields');
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateAsPerDocument)) {
      throw new Error('Invalid date format for dateAsPerDocument; use YYYY-MM-DD');
    }
    if (pincode && !/^\d{6}$/.test(pincode)) {
      throw new Error('Invalid pincode; must be 6 digits');
    }
    if (senderWithinAerb === 'true' && (!senderDivision || !senderSection)) {
      throw new Error('Sender division and section required for AERB sender');
    }
    if (senderWithinAerb === 'true' && senderType !== 'CentralGovt') {
      throw new Error('Sender type must be CentralGovt for AERB sender');
    }
    if (senderWithinAerb !== 'true' && (!city || !state || !country)) {
      throw new Error('Address fields required for external sender');
    }

    const inwardNumber = await generateInwardNumber(receivingDivision, receivingSection, procedures, topic, subtopic);
    
    let ackNumber = null;
    if (inwardType === 'With ACK') {
      const [ackResults] = await connection.query(
        'SELECT value FROM counters WHERE name = ? FOR UPDATE',
        ['ack_number']
      );
      if (ackResults.length === 0) {
        throw new Error('Acknowledgment counter not initialized');
      }
      ackNumber = ackResults[0].value.toString().padStart(6, '0');
      await connection.query(
        'UPDATE counters SET value = value + 1 WHERE name = ?',
        ['ack_number']
      );
    }

    let documentPath = null;
    if (req.file) {
      const inputPath = req.file.path;
      const outputPath = path.join(__dirname, '../public/Uploads/inward', `${inwardNumber.split('/').join('-')}.pdf`);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await watermarkPDF(inputPath, inwardNumber, outputPath);
      documentPath = `/Uploads/inward/${inwardNumber.split('/').join('-')}.pdf`;
      await fs.unlink(inputPath);
    }

    const query = `
      INSERT INTO inward_documents (
        inward_number, reference_number, subject, language, date_as_per_document, inward_type, ack_number,
        submission_type, document_path, sender_within_aerb, sender_division,
        sender_section, sender_name, sender_email, sender_type, pincode, city, state, region,
        country, receiving_division, receiving_section, receiver, next_action_by, reply_expected,
        procedures, topic, subtopic
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      inwardNumber, referenceNumber, subject, language, dateAsPerDocument, inwardType, ackNumber,
      submissionType, documentPath, senderWithinAerb === 'true',
      senderDivision || null, senderSection || null, senderName, senderEmail, senderType,
      pincode || null, city || null, state || null, region || null, country || null,
      receivingDivision, receivingSection, receiver, nextActionBy, replyExpected === 'true',
      procedures || null, topic || null, subtopic || null
    ];

    const [results] = await connection.query(query, values);
    await connection.commit();

    res.status(200).json({
      message: 'Inward document saved successfully',
      id: results.insertId,
      inwardNumber,
      ackNumber,
    });
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error saving inward document:', err.message, err.stack);
    res.status(500).json({
      message: 'Database error',
      details: err.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.post('/api/outward-documents', upload.single('document'), async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const {
      inwardId, referenceNumber, subject, procedureName, language, recipient, organization,
      pincode, city, state, region, country, addressedTo, sender, division, section,
      procedures, topic, subtopic, dateSent, submissionType, ccRecipients, hardCopies,
    } = req.body;

    const requiredFields = {
      referenceNumber, subject, language, recipient, organization, pincode, city, state,
      region, country, addressedTo, sender, division, section, dateSent, submissionType,
    };
    const missingFields = Object.keys(requiredFields).filter(key => !requiredFields[key]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateSent)) {
      throw new Error('Invalid date format for dateSent; use YYYY-MM-DD');
    }
    if (!/^\d{6}$/.test(pincode)) {
      throw new Error('Invalid pincode format; must be 6 digits');
    }
    if ((topic || subtopic) && !procedures) {
      throw new Error('Procedures is required when topic or subtopic is provided');
    }

    let ccRecipientsJson = null;
    if (ccRecipients) {
      try {
        const ccArray = typeof ccRecipients === 'string' ? ccRecipients.split(',').map(id => id.trim()).filter(id => id) : ccRecipients;
        if (ccArray.length > 0) {
          ccRecipientsJson = JSON.stringify(ccArray);
        }
      } catch (error) {
        throw new Error('Invalid CC recipients format');
      }
    }

    const outwardNumber = await generateOutwardNumber(
      division,
      section,
      procedures || 'UNKNOWN',
      topic || 'UNKNOWN',
      subtopic || 'UNKNOWN'
    );

    let documentPath = null;
    if (req.file) {
      const inputPath = req.file.path;
      const outputPath = path.join(__dirname, '../public/Uploads/outward', `${outwardNumber.split('/').join('-')}.pdf`);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await watermarkPDF(inputPath, outwardNumber, outputPath);
      documentPath = `/Uploads/outward/${outwardNumber.split('/').join('-')}.pdf`;
      await fs.unlink(inputPath);
    }

    const query = `
      INSERT INTO outward_documents (
        outward_number, inward_id, reference, subject, procedure_name, language, recipient, organization,
        pincode, city, state, region, country, addressedTo, sender, division, section,
        procedures, topic, subtopic, date_sent, submission_type, cc_recipients, hard_copies, document_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      outwardNumber, inwardId || null, referenceNumber, subject, procedureName || null, language,
      recipient, organization, pincode, city, state, region, country, addressedTo,
      sender, division, section, procedures || null, topic || null, subtopic || null,
      dateSent, submissionType, ccRecipientsJson, hardCopies || null, documentPath,
    ];

    const [result] = await connection.query(query, values);

    if (inwardId) {
      await connection.query(
        `UPDATE inward_documents
         SET outward_id = ?
         WHERE id = ? AND reply_expected = TRUE AND outward_id IS NULL`,
        [result.insertId, inwardId]
      );
    }

    await connection.commit();
    res.json({ message: 'Outward document saved successfully', id: result.insertId, outwardNumber });
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error saving outward document:', err);
    res.status(500).json({ message: 'Database error', details: err.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

initializeDatabase().then(() => {
  app.listen(4000, () => {
    console.log('Inward server running on http://localhost:4000');
  });
}).catch(err => {
  console.error('Failed to start server:', err);
});
