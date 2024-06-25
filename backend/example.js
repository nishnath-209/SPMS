const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const app = express();
app.use(express.json());
app.use(cors());
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Nishnath',
    database: 'spms'
});

let userInfo =[]; 

app.post('/', (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const checkAccountQuery = "SELECT id, password FROM spms.users WHERE email = ?";
    db.query(checkAccountQuery, [email], (err, data) => {
        if (data.length === 0) {
           return res.send("Account doesn't exist.");
        }
        const storedPassword = data[0].password;
        if (password === storedPassword) {
           loggedInUserId = data[0].id; // Store user's ID upon successful login
           return res.send("Succesful",data[0].role);
        } else {
            return res.send("Wrong Password");
        }
    });
});
// Logout endpoint to clear the loggedInUserId variable
app.post('/logout', (req, res) => {
    loggedInUserId = null; // Clear the logged-in user's ID upon logout
    res.send("Logged out successfully");
});
app.post('/signUp', (req,res) => {
    const email = req.body.email;
    const password = req.body.password;
    const username = req.body.username;
    const checkAccountQuery = "SELECT id, password FROM spms.users WHERE email = ?";
    db.query(checkAccountQuery, [email], (err, data) => {
        if (data.length != 0) {
             return res.send("Account already exists");
        }
        else{
            const q = validatePassword(password);
            if(q==="Valid Password")
            {
                const userdata = {
                    'username': username,
                    'password':password,
                    'email':email,
                    'role':'non member'
                };
                 db.query('INSERT INTO spms.users SET ?', userdata, (err,results) => {
                    if (err) throw res.status(500).send('Error signing up.');
                    return res.send('Succesful');
                 })
            }
            else
            {
                return res.send(q);
            }
        }
    });
})
function validatePassword(password) {
    // Regular expressions to match password criteria
    const regexUpperCase = /[A-Z]/; // At least one uppercase letter
    const regexLowerCase = /[a-z]/; // At least one lowercase letter
    const regexNumber = /[0-9]/;     // At least one digit
    const regexSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/; // At least one special character
    const minLength = 7; // Minimum length of the password
    // Check if password meets all criteria
    if (!regexUpperCase.test(password))
    {
        return "Uppercase";
    }
    if(!regexLowerCase.test(password))
    {
        return "Lowercase";
    }
    if(!regexNumber.test(password))
    {
        return "Number";
    }
    if(!regexSpecial.test(password))
    {
        return "Specialchar";
    }
    if(password.length < minLength)
    {
        return "MinLength";
    }
     return "Valid Password"; // Password is valid
}
app.put('/home/editProfile', (req, res) => {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    const phoneNumber = req.body.phoneNumber;
    const medicalCertificate = req.body.medicalCertificate;
    // Update user profile in MySQL
    connection.query(
        'UPDATE users SET username = ?, email = ?, password = ?, phoneNumber = ?, medicalCertificate = ? WHERE userId = ?',
        [username, email, password, phoneNumber, medicalCertificate, loggedInUserId],
        (error, results, fields) => {
            if (err) {
                console.error('Error updating profile:', err);
                res.status(500).send('Error updating profile');
            } else {
                res.send('Profile updated successfully');
            }
        }
    );
});
app.put('/manager/editProfile', (req, res) => {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    const phoneNumber = req.body.phoneNumber;
    // Update user profile in MySQL
    connection.query(
        'UPDATE users SET username = ?, email = ?, password = ?, phoneNumber = ? WHERE userId = ?',
        [username, email, password, phoneNumber, loggedInUserId],
        (err, results, fields) => {
            if (err) {
                console.error('Error updating profile:', err);
                res.status(500).send('Error updating profile');
            } else {
                res.send('Profile updated successfully');
            }
        }
    );
});
app.get('/manager/approvals', (req,res) => {
    const query = 'SELECT * from approvals';
    connection.query(query, (error, results, fields) => {
        if (error) {
          // Handle error
          console.error('Error fetching data: ', error);
          res.status(500).send('Error fetching data');
          return;
        }
        // Process the results and store them in an array
        const approvalsArray = results.map(result => {
          return {
            approvalId: result.approval_id,
            // Map other fields as needed
          };
        });
        // Send the array as response
        res.json(approvalsArray);
      });
})
app.delete('/manager/approvals',(req,res) => {
    const data = req.body;
    if(data.approvals === 'Yes') {
        db.query('UPDATE users SET role = ? WHERE username = ?', ['Member', data.username], (error, results) => {
            if (error) {
                console.error('Error updating user role:', error);
                res.status(500).send('Error updating user role');
                return;
            }
            db.query('DELETE FROM approvals WHERE username = ?', data.username, (error, results) => {
                if (error) {
                    console.error('Error deleting approval:', error);
                    res.status(500).send('Error deleting approval');
                    return;
                }
                res.send('Updated successfully');
            });
        });
    } else if(data.approvals === 'No') {
        db.query('UPDATE users SET role = ? WHERE username = ?', ['Non-Member', data.username], (error, results) => {
            if (error) {
                console.error('Error updating user role:', error);
                res.status(500).send('Error updating user role');
                return;
            }
            db.query('DELETE FROM approvals WHERE username = ?', data.username, (error, results) => {
                if (error) {
                    console.error('Error deleting approval:', error);
                    res.status(500).send('Error deleting approval');
                    return;
                }
                res.send('Updated successfully');
            });
        });
    }
});
app.post('/home/bookSlots', (req,res) => {
    const slots = req.body.slots;
    const dates = req.body.dates;
    const q = 'SELECT slots from users where userId = loggedInUserId'
    if(q.length+slots.length>5)
    {
        return res.send(5-q.length);
    }
    else
    {
    }
})
app.post('/home/bookPool', (req, res) => {
})
app.post('/home/events', (req,res) => {
})
app.listen(8000, () => console.log('running backend...'));





