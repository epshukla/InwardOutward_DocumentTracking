const mysql = require("mysql");

const connection = mysql.createConnection({
    host:"localhost",
    user:"root",
    password:"HiThere@2000"
})

connection.connect((err)=>{
    if(err) throw err;
    console.log("Coonected Succesfully");

    connection.query("Create database if not exists aerb_db",(err)=>{
        if(err) throw err;
        console.log("Database created succesfully");

        connection.query("Use aerb_db",(err)=>{
            if(err) throw err;
            console.log("Using database");

            connection.query("Create table if not exists emp(id int, EmpCode int, EmpName text, Designation Varchar(50), role varchar(30), Email text, Division varchar(28), Section varchar(28), DOB date, status varchar(1), intercom varchar(15), mobile varchar(15), residence_no varchar(15), Note varchar(100))",(err)=>{
                if(err) throw err;
                console.log("Table created!");

                const employees = [
                    [1, 1001, 'John Doe', 'Engineer', 'Developer', 'john.doe@example.com', 'Tech', 'DevOps', '1990-01-01', 'A', '1001', '9876543210', '0221234567','Good'],
                    [2, 1002, 'Jane Smith', 'Manager', 'Team Lead', 'jane.smith@example.com', 'Admin', 'HR', '1985-03-21', 'A', '1002', '9876543211', '0221234568','Good'],
                    [3, 1003, 'Raj Patel', 'Technician', 'Support', 'raj.patel@example.com', 'Operations', 'Maintenance', '1992-06-15', 'A', '1003', '9876543212', '0221234569','Good'],
                    [4, 1004, 'Sara Khan', 'Scientist', 'Analyst', 'sara.khan@example.com', 'Research', 'Physics', '1988-09-10', 'A', '1004', '9876543213', '0221234570','Good'],
                    [5, 1005, 'Amit Joshi', 'Clerk', 'Accounts', 'amit.joshi@example.com', 'Finance', 'Billing', '1993-12-05', 'A', '1005', '9876543214', '0221234571','Good'],
                    [6, 1006, 'Priya Mehta', 'Officer', 'Coordinator', 'priya.mehta@example.com', 'Tech', 'QA', '1991-07-19', 'A', '1006', '9876543215', '0221234572','Good'],
                    [7, 1007, 'Sunil Sharma', 'Engineer', 'Hardware', 'sunil.sharma@example.com', 'Infra', 'Power', '1994-11-23', 'A', '1007', '9876543216', '0221234573','Bad'],
                    [8, 1008, 'Neha Verma', 'Analyst', 'Data', 'neha.verma@example.com', 'IT', 'Analytics', '1995-04-18', 'A', '1008', '9876543217', '0221234574','Good'],
                    [9, 1009, 'Kunal Das', 'Developer', 'Frontend', 'kunal.das@example.com', 'Tech', 'Web', '1990-10-30', 'A', '1009', '9876543218', '0221234575','Good'],
                    [10, 1010, 'Isha Gupta', 'Engineer', 'Backend', 'isha.gupta@example.com', 'Tech', 'API', '1989-02-12', 'A', '1010', '9876543219', '0221234576','Good']
                ];

                const insertQuery = `INSERT INTO emp (id, EmpCode, EmpName, Designation, role, Email, Division, Section, DOB, status, intercom, mobile, residence_no, Note) VALUES ?`;

                connection.query(insertQuery, [employees], (err, result) => {
                    if (err) throw err;
                    console.log(`Inserted ${result.affectedRows} rows into emp table`);
                    
                });

            })

        })
    });

})