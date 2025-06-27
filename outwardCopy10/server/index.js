const express = require('express');
const mysql = require('mysql');
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

const storage = multer.diskStorage({
  destination: './public/Uploads/outward',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
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
  }
});

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'HiThere@2000',
  database: 'aerb_db'
};

const pool = mysql.createPool(dbConfig);

function initializeDatabase(callback) {
  const connection = mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password
  });

  connection.connect((err) => {
    if (err) {
      console.error('Failed to connect to MySQL:', err);
      return callback(err);
    }
    console.log('Connected to MySQL server');

    connection.query('CREATE DATABASE IF NOT EXISTS aerb_db', (err) => {
      if (err) {
        console.error('Failed to create database:', err);
        connection.end();
        return callback(err);
      }
      console.log('Database aerb_db ensured');

      connection.query('USE aerb_db', (err) => {
        if (err) {
          console.error('Failed to use database aerb_db:', err);
          connection.end();
          return callback(err);
        }

        connection.query(`
          CREATE TABLE IF NOT EXISTS divisions (
            id INT PRIMARY KEY AUTO_INCREMENT,
            abbreviation VARCHAR(10) NOT NULL UNIQUE,
            name VARCHAR(100) NOT NULL,
            sequence INT NOT NULL
          )
        `, (err) => {
          if (err) {
            console.error('Failed to create divisions table:', err);
            connection.end();
            return callback(err);
          }
          console.log('Divisions table ensured');

          connection.query(`
            CREATE TABLE IF NOT EXISTS sections (
              id INT PRIMARY KEY AUTO_INCREMENT,
              division_id INT NOT NULL,
              abbreviation VARCHAR(10) NOT NULL,
              name VARCHAR(100) NOT NULL,
              sequence INT NOT NULL,
              FOREIGN KEY (division_id) REFERENCES divisions(id),
              UNIQUE(division_id, abbreviation)
            )
          `, (err) => {
            if (err) {
              console.error('Failed to create sections table:', err);
              connection.end();
              return callback(err);
            }
            console.log('Sections table ensured');

            connection.query(`
              CREATE TABLE IF NOT EXISTS procedures (
                id INT PRIMARY KEY AUTO_INCREMENT,
                abbreviation VARCHAR(50) NOT NULL UNIQUE,
                name VARCHAR(100) NOT NULL,
                sequence INT NOT NULL
              )
            `, (err) => {
              if (err) {
                console.error('Failed to create procedures table:', err);
                connection.end();
                return callback(err);
              }
              console.log('Procedures table ensured');

              connection.query(`
                CREATE TABLE IF NOT EXISTS topics (
                  id INT PRIMARY KEY AUTO_INCREMENT,
                  procedure_id INT NOT NULL,
                  abbreviation VARCHAR(50) NOT NULL,
                  name VARCHAR(100) NOT NULL,
                  sequence INT NOT NULL,
                  FOREIGN KEY (procedure_id) REFERENCES procedures(id),
                  UNIQUE(procedure_id, abbreviation)
                )
              `, (err) => {
                if (err) {
                  console.error('Failed to create topics table:', err);
                  connection.end();
                  return callback(err);
                }
                console.log('Topics table ensured');

                connection.query(`
                  CREATE TABLE IF NOT EXISTS subtopics (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    topic_id INT NOT NULL,
                    abbreviation VARCHAR(50) NOT NULL,
                    name VARCHAR(100) NOT NULL,
                    sequence INT NOT NULL,
                    FOREIGN KEY (topic_id) REFERENCES topics(id),
                    UNIQUE(topic_id, abbreviation)
                  )
                `, (err) => {
                  if (err) {
                    console.error('Failed to create subtopics table:', err);
                    connection.end();
                    return callback(err);
                  }
                  console.log('Subtopics table ensured');

                  connection.query(`
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
                  `, (err) => {
                    if (err) {
                      console.error('Failed to create emp table:', err);
                      connection.end();
                      return callback(err);
                    }
                    console.log('Emp table ensured');

                    connection.query(`
                      CREATE TABLE IF NOT EXISTS counters (
                        name VARCHAR(255) PRIMARY KEY,
                        value INT NOT NULL
                      )
                    `, (err) => {
                      if (err) {
                        console.error('Failed to create counters table:', err);
                        connection.end();
                        return callback(err);
                      }
                      console.log('Counters table ensured');

                      connection.query(
                        'INSERT IGNORE INTO counters (name, value) VALUES (?, ?)',
                        ['ack_number', 100000],
                        (err) => {
                          if (err) {
                            console.error('Failed to insert into counters:', err);
                            connection.end();
                            return callback(err);
                          }
                          console.log('Counters initialized');

                          connection.query(`
                            CREATE TABLE IF NOT EXISTS inward_documents (
                              id INT PRIMARY KEY AUTO_INCREMENT,
                              inward_number VARCHAR(255),
                              reference_number VARCHAR(50) NOT NULL,
                              subject VARCHAR(100) NOT NULL,
                              language ENUM('Hindi', 'English', 'Bilingual', 'Other') NOT NULL,
                              date_as_per_document DATE NOT NULL,
                              inward_type ENUM('With ACK', 'Without ACK') NOT NULL,
                              ack_number VARCHAR(6),
                              subtopic VARCHAR(50) NOT NULL,
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
                              outward_id INT,
                              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                              FOREIGN KEY (outward_id) REFERENCES outward_documents(id)
                            )
                          `, (err) => {
                            if (err) {
                              console.error('Failed to create inward_documents table:', err);
                              connection.end();
                              return callback(err);
                            }
                            console.log('Inward_documents table ensured');

                            connection.query(`
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
                                addressedTo ENUM('CentralGovt','StateGovt','PrivateOrg','Citizen','Other') NOT NULL,
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
                                cc_recipients JSON DEFAULT NULL,
                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                FOREIGN KEY (inward_id) REFERENCES inward_documents(id)
                              )
                            `, (err) => {
                              if (err) {
                                console.error('Failed to create outward_documents table:', err);
                                connection.end();
                                return callback(err);
                              }
                              console.log('Outward_documents table ensured');

                              const divisions = [
                                { abbreviation: 'OPSD', name: 'Operating Plant Safety Division', sequence: 1 },
                                { abbreviation: 'NPSD', name: 'Nuclear Projects Safety Division', sequence: 2 },
                                { abbreviation: 'RASD', name: 'Radiation Applications Safety Division', sequence: 3 },
                                { abbreviation: 'NSAD', name: 'Nuclear Safety Analysis Division', sequence: 4 },
                                { abbreviation: 'IT&RDD', name: 'Information Technology and Regulatory Documents Division', sequence: 5 },
                                { abbreviation: 'DRI', name: 'Division of Regulatory Inspection', sequence: 6 },
                                { abbreviation: 'DRA&ER', name: 'Directorate of Regulatory Affairs & External Relations', sequence: 7 },
                                { abbreviation: 'DRP&E', name: 'Division of Radiation Protection & Environment', sequence: 8 },
                                { abbreviation: 'SRI', name: 'Safety Research Institute', sequence: 9 },
                                { abbreviation: 'RRC', name: 'Regional Regulatory Center', sequence: 10 }
                              ];

                              connection.query(
                                'INSERT IGNORE INTO divisions (abbreviation, name, sequence) VALUES ?',
                                [divisions.map(d => [d.abbreviation, d.name, d.sequence])],
                                (err, result) => {
                                  if (err) {
                                    console.error('Failed to insert divisions:', err);
                                    connection.end();
                                    return callback(err);
                                  }
                                  console.log(`Inserted ${result.affectedRows} divisions`);

                                  const sections = [
                                    { division: 'OPSD', abbreviation: 'SRS', name: 'Safety Review Section', sequence: 1 },
                                    { division: 'OPSD', abbreviation: 'OCS', name: 'Operational Compliance Section', sequence: 2 },
                                    { division: 'NPSD', abbreviation: 'PAS', name: 'Project Assessment Section', sequence: 1 },
                                    { division: 'NPSD', abbreviation: 'DSS', name: 'Design Safety Section', sequence: 2 },
                                    { division: 'RASD', abbreviation: 'RSS', name: 'Radiation Safety Section', sequence: 1 },
                                    { division: 'RASD', abbreviation: 'ACS', name: 'Application Compliance Section', sequence: 2 },
                                    { division: 'NSAD', abbreviation: 'ANS', name: 'Analysis Section', sequence: 1 },
                                    { division: 'NSAD', abbreviation: 'SIMS', name: 'Simulation Section', sequence: 2 },
                                    { division: 'IT&RDD', abbreviation: 'ITS', name: 'IT Section', sequence: 1 },
                                    { division: 'IT&RDD', abbreviation: 'RDS', name: 'Regulatory Docs Section', sequence: 2 },
                                    { division: 'DRI', abbreviation: 'INS', name: 'Inspection Section', sequence: 1 },
                                    { division: 'DRI', abbreviation: 'CS', name: 'Compliance Section', sequence: 2 },
                                    { division: 'DRA&ER', abbreviation: 'AFS', name: 'Affairs Section', sequence: 1 },
                                    { division: 'DRA&ER', abbreviation: 'ERS', name: 'External Relations Section', sequence: 2 },
                                    { division: 'DRP&E', abbreviation: 'RPS', name: 'Radiation Protection Section', sequence: 1 },
                                    { division: 'DRP&E', abbreviation: 'ES', name: 'Environment Section', sequence: 2 },
                                    { division: 'SRI', abbreviation: 'RS', name: 'Research Section', sequence: 1 },
                                    { division: 'SRI', abbreviation: 'IS', name: 'Innovation Section', sequence: 2 },
                                    { division: 'RRC', abbreviation: 'REGS', name: 'Regional Section', sequence: 1 },
                                    { division: 'RRC', abbreviation: 'MS', name: 'Monitoring Section', sequence: 2 }
                                  ];

                                  let sectionIndex = 0;
                                  function insertSections() {
                                    if (sectionIndex >= sections.length) {
                                      const procedures = [
                                        { abbreviation: 'REGDOC', name: 'Regulatory Documents', sequence: 1 },
                                        { abbreviation: 'RMS', name: 'Resource Management System', sequence: 2 },
                                        { abbreviation: 'ITSS', name: 'IT Support Services', sequence: 3 },
                                        { abbreviation: 'RALP', name: 'Review, Assessment for Licensing Process', sequence: 4 },
                                        { abbreviation: 'RI', name: 'Regulatory Inspections', sequence: 5 },
                                        { abbreviation: 'SWNT', name: 'Seminars/Workshops/NCRI Training', sequence: 6 },
                                        { abbreviation: 'FM', name: 'Financial Matters', sequence: 7 },
                                        { abbreviation: 'AM', name: 'Administrative Matters', sequence: 8 },
                                        { abbreviation: 'MM', name: 'Management Matters', sequence: 9 }
                                      ];

                                      connection.query(
                                        'INSERT IGNORE INTO procedures (abbreviation, name, sequence) VALUES ?',
                                        [procedures.map(p => [p.abbreviation, p.name, p.sequence])],
                                        (err) => {
                                          if (err) {
                                            console.error('Failed to insert procedures:', err);
                                            connection.end();
                                            return callback(err);
                                          }
                                          console.log('Procedures inserted');

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
                                            { procedure: 'MM', abbreviation: 'BM', name: 'Board Meeting', sequence: 11 }
                                          ];

                                          let topicIndex = 0;
                                          function insertTopics() {
                                            if (topicIndex >= topics.length) {
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
                                                { procedure: 'MM', topic: 'BM', abbreviation: 'PRIS', name: 'PRIS-G', sequence: 1 }
                                              ];

                                              let subtopicIndex = 0;
                                              function insertSubtopics() {
                                                if (subtopicIndex >= subtopics.length) {
                                                  const employees = [
                                                    { EmpCode: '1001', EmpName: 'John Doe', Designation: 'SOH', role: 'SOH', Email: 'john.doe@example.com', Division: 'OPSD', Section: 'SRS', DOB: '1990-01-01', status: 'A', intercom: '1001', mobile: '9876543210', residence_no: '221234567' },
                                                    { EmpCode: '1002', EmpName: 'Amit Sharma', Designation: 'SOF', role: 'SOF', Email: 'amit.sharma@example.com', Division: 'OPSD', Section: 'OCS', DOB: '1985-05-15', status: 'A', intercom: '1002', mobile: '441', residence_no: '2212345678' },
                                                    { EmpCode: '1003', EmpName: 'Priya Patel', Designation: 'DES', role: 'DES', Email: 'priya.patel@example.com', Division: 'NPSD', Section: 'PAS', DOB: '1988-12-03', status: 'A', intercom: '1003', mobile: '9876543212', residence_no: '912345678' },
                                                    { EmpCode: '1004', EmpName: 'Rahul Singh', Designation: 'SOH', role: 'SOH', Email: 'rahul.singh@example.com', Division: 'NPSD', Section: 'DSS', DOB: '1987-06-22', status: 'A', intercom: '1004', mobile: '9876543213', residence_no: '912345679' },
                                                    { EmpCode: '1005', EmpName: 'Neha Gupta', Designation: 'SOF', role: 'SOF', Email: 'neha.gupta@example.com', Division: 'RASD', Section: 'RSS', DOB: '1990-04-15', status: 'A', intercom: '1005', mobile: '9876543214', residence_no: '912345670' },
                                                    { EmpCode: '1006', EmpName: 'Anup Shinde', Designation: 'SOH', role: 'SOH', Email: 'anup.shinde@example.com', Division: 'OPSD', Section: 'SRS', DOB: '1989-09-10', status: 'A', intercom: '1006', mobile: '9876543215', residence_no: '912345671' }
                                                  ];

                                                  connection.query(
                                                    'INSERT IGNORE INTO emp (EmpCode, EmpName, Designation, role, Email, Division, Section, DOB, status, intercom, mobile, residence_no) VALUES ?',
                                                    [employees.map(e => [e.EmpCode, e.EmpName, e.Designation, e.role, e.Email, e.Division, e.Section, e.DOB, e.status, e.intercom, e.mobile, e.residence_no])],
                                                    (err) => {
                                                      if (err) {
                                                        console.error('Failed to insert employees:', err);
                                                        connection.end();
                                                        return callback(err);
                                                      }
                                                      console.log('Employees inserted');
                                                      connection.end();
                                                      return callback(null);
                                                    }
                                                  );
                                                  return;
                                                }
                                                const st = subtopics[subtopicIndex];
                                                if (!st.procedure || !st.topic || !st.abbreviation || !st.name || !st.sequence) {
                                                  console.error(`Invalid subtopic at index ${subtopicIndex}:`, st);
                                                  connection.end();
                                                  return callback(new Error(`Invalid subtopic data at index ${subtopicIndex}`));
                                                }
                                                connection.query(
                                                  'SELECT t.id FROM topics t JOIN procedures p ON t.procedure_id = p.id WHERE t.abbreviation = ? AND p.abbreviation = ?',
                                                  [st.topic, st.procedure],
                                                  (err, results) => {
                                                    if (err || !results[0]) {
                                                      console.error(`Failed to find topic ${st.topic} for procedure ${st.procedure}:`, err);
                                                      connection.end();
                                                      return callback(err || new Error(`Topic ${st.topic} not found for procedure ${st.procedure}`));
                                                    }
                                                    connection.query(
                                                      'INSERT IGNORE INTO subtopics (topic_id, abbreviation, name, sequence) VALUES (?, ?, ?, ?)',
                                                      [results[0].id, st.abbreviation, st.name, st.sequence],
                                                      (err) => {
                                                        if (err) {
                                                          console.error('Failed to insert subtopic:', err);
                                                          connection.end();
                                                          return callback(err);
                                                        }
                                                        subtopicIndex++;
                                                        insertSubtopics();
                                                      }
                                                    );
                                                  }
                                                );
                                              }
                                              insertSubtopics();
                                              return;
                                            }
                                            const t = topics[topicIndex];
                                            if (!t.procedure || !t.abbreviation || !t.name || !t.sequence) {
                                              console.error(`Invalid topic at index ${topicIndex}:`, t);
                                              connection.end();
                                              return callback(new Error(`Invalid topic data at index ${topicIndex}`));
                                            }
                                            connection.query(
                                              'SELECT id FROM procedures WHERE abbreviation = ?',
                                              [t.procedure],
                                              (err, results) => {
                                                if (err || !results[0]) {
                                                  console.error(`Failed to find procedure ${t.procedure}:`, err);
                                                  connection.end();
                                                  return callback(err || new Error(`Procedure ${t.procedure} not found`));
                                                }
                                                connection.query(
                                                  'INSERT IGNORE INTO topics (procedure_id, abbreviation, name, sequence) VALUES (?, ?, ?, ?)',
                                                  [results[0].id, t.abbreviation, t.name, t.sequence],
                                                  (err) => {
                                                    if (err) {
                                                      console.error('Failed to insert topic:', err);
                                                      connection.end();
                                                      return callback(err);
                                                    }
                                                    topicIndex++;
                                                    insertTopics();
                                                  }
                                                );
                                              }
                                            );
                                          }
                                          insertTopics();
                                        }
                                      );
                                      return;
                                    }
                                    const s = sections[sectionIndex];
                                    if (!s.division || !s.abbreviation || !s.name || !s.sequence) {
                                      console.error(`Invalid section at index ${sectionIndex}:`, s);
                                      connection.end();
                                      return callback(new Error(`Invalid section data at index ${sectionIndex}`));
                                    }
                                    connection.query(
                                      'SELECT id FROM divisions WHERE abbreviation = ?',
                                      [s.division],
                                      (err, results) => {
                                        if (err || !results[0]) {
                                          console.error(`Failed to find division ${s.division}:`, err);
                                          connection.end();
                                          return callback(err || new Error(`Division ${s.division} not found`));
                                        }
                                        connection.query(
                                          'INSERT IGNORE INTO sections (division_id, abbreviation, name, sequence) VALUES (?, ?, ?, ?)',
                                          [results[0].id, s.abbreviation, s.name, s.sequence],
                                          (err) => {
                                            if (err) {
                                              console.error('Failed to insert section:', err);
                                              connection.end();
                                              return callback(err);
                                            }
                                            sectionIndex++;
                                            insertSections();
                                          }
                                        );
                                      }
                                    );
                                  }
                                  insertSections();
                                }
                              );
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  };

async function watermarkPDF(inputPath, outwardNumber, outputPath) {
  try {
    console.log('Watermarking PDF:', { inputPath, outputPath, outwardNumber });
    const pdfBytes = await fs.readFile(inputPath);
    console.log('PDF read successfully, size:', pdfBytes.length);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    console.log('PDF loaded successfully');
    const pages = pdfDoc.getPages();
    if (!pages.length) throw new Error('No pages in PDF');
    const firstPage = pages[0];
    const { width } = firstPage.getSize();
    firstPage.drawText(outwardNumber, {
      x: 50,
      y: firstPage.getHeight() - 50,
      size: 50,
      opacity: 0.5
    });
    const pdfBytesWatermarked = await pdfDoc.save();
    await fs.writeFile(outputPath, pdfBytesWatermarked);
    console.log('PDF watermarked and saved');
  } catch (error) {
    console.error('Watermark Error:', error.message, error.stack);
    throw error;
  }
}

function generateOutwardNumber(division, section, procedures, topic, subtopic, callback) {
  const year = new Date().getFullYear();
  pool.query(
    `SELECT d.sequence AS div_seq, s.sequence AS sec_seq, p.sequence AS proc_seq, t.sequence AS topic_seq, st.sequence AS subtopic_seq
     FROM divisions d
     LEFT JOIN sections s ON d.id = s.division_id AND s.abbreviation = ?
     LEFT JOIN procedures p ON p.abbreviation = ?
     LEFT JOIN topics t ON p.id = t.procedure_id AND t.abbreviation = ?
     LEFT JOIN subtopics st ON t.id = st.topic_id AND st.abbreviation = ?
     WHERE d.abbreviation = ?`,
    [section, procedures, topic, subtopic, division],
    (err, results) => {
      if (err || !results[0]) return callback(err || new Error('Invalid division/section/procedures/topic/subtopic'));
      const { div_seq, sec_seq, proc_seq, topic_seq, subtopic_seq } = results[0];
      const encoded = `${div_seq}${sec_seq}${proc_seq}${topic_seq}${subtopic_seq}`;
      const prefix = `AERB/${division}/${section}/${procedures}/${topic}/${subtopic}/${encoded}/${year}/`;
      pool.query(
        `SELECT COUNT(*) as count FROM outward_documents WHERE outward_number LIKE ?`,
        [`${prefix}%`],
        (err, results) => {
          if (err) return callback(err);
          if (!results || !results[0] || typeof results[0].count !== 'number') {
            return callback(new Error('Invalid query result'));
          }
          const sequence = String(results[0].count + 1).padStart(3, '0');
          callback(null, `${prefix}${sequence}`);
        }
      );
    }
  );
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
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

app.get('/api/divisions', (req, res) => {
  console.log('Received request for /api/divisions');
  pool.query('SELECT abbreviation, name FROM divisions ORDER BY sequence', (err, results) => {
    if (err) {
      console.error('Database error in /api/divisions:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    console.log('Divisions query results:', results);
    res.json(results);
  });
});

app.get('/api/sections', (req, res) => {
  const division = req.query.division;
  if (!division) return res.status(400).json({ message: 'Division required' });
  pool.query(
    `SELECT s.abbreviation, s.name 
     FROM sections s 
     JOIN divisions d ON s.division_id = d.id 
     WHERE d.abbreviation = ? 
     ORDER BY s.sequence`,
    [division],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      res.json(results);
    }
  );
});

app.post('/api/sections', (req, res) => {
  const { division, abbreviation, name } = req.body;
  if (!division || !abbreviation || !name) {
    return res.status(400).json({ message: 'Division, abbreviation, and name required' });
  }
  pool.query(
    'SELECT id, (SELECT MAX(sequence) FROM sections WHERE division_id = divisions.id) as max_seq FROM divisions WHERE abbreviation = ?',
    [division],
    (err, results) => {
      if (err || !results[0]) return res.status(500).json({ message: 'Division not found' });
      const divisionId = results[0].id;
      const sequence = (results[0].max_seq || 0) + 1;
      pool.query(
        'INSERT INTO sections (division_id, abbreviation, name, sequence) VALUES (?, ?, ?, ?)',
        [divisionId, abbreviation, name, sequence],
        (err) => {
          if (err) return res.status(500).json({ message: 'Failed to add section' });
          res.json({ abbreviation, name });
        }
      );
    }
  );
});

app.get('/api/procedures', (req, res) => {
  pool.query(
    'SELECT abbreviation, name FROM procedures ORDER BY sequence',
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      res.json(results);
    }
  );
});

app.get('/api/topics', (req, res) => {
  const procedure = req.query.procedure;
  if (!procedure) return res.status(400).json({ message: 'Procedure required' });
  pool.query(
    `SELECT t.abbreviation, t.name 
     FROM topics t 
     JOIN procedures p ON t.procedure_id = p.id 
     WHERE p.abbreviation = ? 
     ORDER BY t.sequence`,
    [procedure],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      res.json(results);
    }
  );
});

app.get('/api/subtopics', (req, res) => {
  const topic = req.query.topic;
  if (!topic) return res.status(400).json({ message: 'Topic required' });
  pool.query(
    `SELECT st.abbreviation, st.name 
     FROM subtopics st 
     JOIN topics t ON st.topic_id = t.id 
     WHERE t.abbreviation = ? 
     ORDER BY st.sequence`,
    [topic],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      res.json(results);
    }
  );
});

app.get('/api/employees', (req, res) => {
  const { division, section } = req.query;
  let query = 'SELECT EmpName FROM emp WHERE status = "A"';
  const params = [];
  if (division) {
    query += ' AND Division = ?';
    params.push(division);
  }
  if (section) {
    query += ' AND Section = ?';
    params.push(section);
  }
  query += ' ORDER BY EmpName';
  pool.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching employees:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    res.json(results.map(r => r.EmpName));
  });
});

app.get('/api/search-employees', (req, res) => {
  pool.query(
    'SELECT EmpCode, EmpName FROM emp WHERE status = "A" ORDER BY EmpName',
    (err, results) => {
      if (err) {
        console.error('Error fetching employees:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json(results);
    }
  );
});
app.get('/api/employee-details', (req, res) => {
  const { name } = req.query;
  if (!name) return res.status(400).json({ message: 'Employee name required' });
  pool.query(
    'SELECT Division, Section FROM emp WHERE EmpName = ? AND status = "A"',
    [name],
    (err, results) => {
      if (err) {
        console.error('Error fetching employee details:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      if (!results[0]) {
        return res.status(404).json({ message: 'Employee not found or not active' });
      }
      res.json(results[0]);
    }
  );
});

app.get('/api/inward-documents/pending-replies', (req, res) => {
  pool.query(
    `SELECT id, inward_number, reference_number, subject, sender_name, sender_type
     FROM inward_documents
     WHERE reply_expected = TRUE AND outward_id IS NULL
     ORDER BY created_at DESC`,
    (err, results) => {
      if (err) {
        console.error('Error fetching pending inward documents:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json(results);
    }
  );
});

app.post('/api/outward', upload.single('document'), (req, res) => {
  const {
    inwardId, reference_number, subject, procedure_name, language, recipient, organization,
    pincode, city, state, region, country, addressed_to, sender, division, section,
    procedures, topic, subtopic, date_sent, submission_type, cc_recipients, hard_copies
  } = req.body;

  // Validate required fields
  const requiredFields = {
    reference_number, subject, language, recipient, organization, pincode, city, state,
    region, country, addressed_to, sender, division, section, date_sent, submission_type
  };
  const missingFields = Object.keys(requiredFields).filter(key => !requiredFields[key]);
  if (missingFields.length > 0) {
    console.error('Missing required fields:', missingFields);
    return res.status(400).json({ message: `Missing required fields: ${missingFields.join(', ')}` });
  }

  // Validate pincode format
  if (!/^\d{6}$/.test(pincode)) {
    return res.status(400).json({ message: 'Invalid pincode format' });
  }

  // Validate procedures if topic or subtopic is provided
  if ((topic || subtopic) && !procedures) {
    return res.status(400).json({ message: 'Procedures is required when topic or subtopic is provided' });
  }

  const documentPath = req.file ? `/Uploads/${req.file.filename}` : null;

  // Process cc_recipients as JSON
  let ccRecipientsJson = null;
  if (cc_recipients) {
    try {
      const ccArray = typeof cc_recipients === 'string' ? cc_recipients.split(',').map(id => id.trim()).filter(id => id) : cc_recipients;
      if (ccArray.length > 0) {
        ccRecipientsJson = JSON.stringify(ccArray);
      }
    } catch (error) {
      console.error('Invalid cc_recipients format:', cc_recipients, error);
      return res.status(400).json({ message: 'Invalid CC recipients format' });
    }
  }

  // Generate outward_number
  generateOutwardNumber(division, section, procedures || 'UNKNOWN', topic || 'UNKNOWN', subtopic || 'UNKNOWN', (err, outwardNumber) => {
    if (err) {
      console.error('Error generating outward number:', err);
      return res.status(500).json({ message: 'Failed to generate outward number' });
    }

    // Insert into outward_documents
    const insertQuery = `
      INSERT INTO outward_documents (
        outward_number, inward_id, reference, subject, procedure_name, language, recipient, organization,
        pincode, city, state, region, country, addressedTo, sender, division, section,
        procedures, topic, subtopic, date_sent, submission_type, cc_recipients, hard_copies, document_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const insertValues = [
      outwardNumber, inwardId || null, reference_number, subject, procedure_name || null, language,
      recipient, organization, pincode, city, state, region, country, addressed_to,
      sender, division, section, procedures || null, topic || null, subtopic || null,
      date_sent, submission_type, ccRecipientsJson, hard_copies || null, documentPath
    ];

    pool.query(insertQuery, insertValues, (err, result) => {
      if (err) {
        console.error('Error inserting outward document:', err);
        return res.status(500).json({ message: 'Database error: ' + err.message });
      }

      const outwardId = result.insertId;

      // Update inward_documents if this is a reply
      if (inwardId) {
        const updateQuery = `
          UPDATE inward_documents
          SET outward_id = ?
          WHERE id = ? AND reply_expected = TRUE AND outward_id IS NULL
        `;
        pool.query(updateQuery, [outwardId, inwardId], (updateErr) => {
          if (updateErr) {
            console.error('Error updating inward document:', updateErr);
            // Don't fail the request, but log the error
          }
        });
      }

      // Optionally watermark the PDF
      if (documentPath) {
        const inputPath = path.join(__dirname, '../public', documentPath);
        const outputPath = inputPath;
        watermarkPDF(inputPath, outwardNumber, outputPath).catch(err => {
          console.error('Failed to watermark PDF:', err);
        });
      }

      res.json({ outwardNumber });
    });
  });
});

app.get('/report', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/report.html'));
});

app.get('/api/senders', (req, res) => {
  pool.query(
    'SELECT DISTINCT sender FROM outward_documents ORDER BY sender',
    (err, results) => {
      if (err) {
        console.error('Error fetching senders:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json(results.map(r => r.EmpName));
    }
  );
});

app.get('/api/report/date-range', (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Start date and end date are required' });
  }

  pool.query(
    `SELECT id, outward_number, inward_id, reference, subject, procedure_name, language, recipient, organization, 
            pincode, city, state, region, country, addressedTo, sender, division, section, 
            procedures, topic, subtopic, date_sent, submission_type, hard_copies, document_path, created_at
     FROM outward_documents
     WHERE date_sent BETWEEN ? AND ?
     ORDER BY date_sent`,
    [startDate, endDate],
    (err, results) => {
      if (err) {
        console.error('Error retrieving date range:', err);
        return res.status(500).json({ message: 'Failed to retrieve date range' });
      }
      res.json(results);
    }
  );
});


app.get('/api/report/language-stats', (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Start date and end date are required' });
  }

  pool.query(
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
    [startDate, endDate],
    (err, results) => {
      if (err) {
        console.error('Error fetching language stats:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json(results);
    }
  );
});

app.get('/api/report/addressed-to-stats', (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Start date and end date are required' });
  }

  pool.query(
    `SELECT addressedTo, COUNT(*) as count
     FROM outward_documents
     WHERE date_sent BETWEEN ? AND ?
     GROUP BY addressedTo`,
    [startDate, endDate],
    (err, results) => {
      if (err) {
        console.error('Error fetching addressedTo stats:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json(results);
    }
  );
});

app.get('/api/report/region-stats', (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Start date and end date are required' });
  }

  pool.query(
    `SELECT region, COUNT(*) as count
     FROM outward_documents
     WHERE date_sent BETWEEN ? AND ? AND region IN ('A', 'B', 'C', 'D')
     GROUP BY region`,
    [startDate, endDate],
    (err, results) => {
      if (err) {
        console.error('Error fetching region stats:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json(results);
    }
  );
});

app.get('/api/report/sender-documents', (req, res) => {
  const { startDate, endDate, sender } = req.query;
  if (!startDate || !endDate || !sender) {
    return res.status(400).json({ message: 'Start date, end date, and sender are required' });
  }

  pool.query(
    `SELECT id, outward_number, inward_id, reference, subject, procedure_name, language, recipient, organization, 
            pincode, city, state, region, country, addressedTo, sender, division, section, 
            procedures, topic, subtopic, date_sent, submission_type, hard_copies, document_path, created_at
     FROM outward_documents
     WHERE date_sent BETWEEN ? AND ? AND sender = ?
     ORDER BY date_sent`,
    [startDate, endDate, sender],
    (err, results) => {
      if (err) {
        console.error('Error fetching sender documents:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json(results);
    }
  );
});

app.get('/api/inward-documents/:id', (req, res) => {
  const inwardId = req.params.id;
  pool.query(
    'SELECT id, inward_number, reference_number, subject, sender_name, sender_type, pincode, city, state, region, country FROM inward_documents WHERE id = ?',
    [inwardId],
    (err, results) => {
      if (err) {
        console.error('Database error in /api/inward-documents/:id:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      if (!results[0]) {
        return res.status(404).json({ message: 'Inward document not found' });
      }
      res.json(results[0]);
    }
  );
});


initializeDatabase((err) => {
  if (err) {
    console.error('Database initialization failed:', err);
    process.exit(1);
  }

  app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
  });
});