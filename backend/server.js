const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const bodyParser = require('body-parser');
const moment = require('moment');
const multer = require('multer');
const path = require('path');
const { createRoutesFromChildren } = require("react-router-dom");


const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

const upload = multer({
    storage: multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, 'uploads/');
      },
      filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
      }
    }),
    fileFilter: function (req, file, cb) {
      const filetypes = /pdf/;
      const mimetype = filetypes.test(file.mimetype);
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
      if (mimetype && extname) {
        return cb(null, true);
      }
      cb('Error: PDF files only!');
    }
  });
  
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
            const userdata = `SELECT * from spms.users WHERE id = ?`;
            db.query(userdata, [data[0].id], (err, data1) => {
                if(err)
                {
                    return res.send('Internal server error.');
                }
                userInfo = data1[0];
                console.log(userInfo);
                //console.log(userdata[0]);
                return res.send({ status: "Successful", userData: { id: userInfo.id, username: userInfo.username ,gender:userInfo.gender,role:userInfo.role,password:userInfo.password,approved:userInfo.approved} });

            });

        } else {
            return res.send("Wrong Password");
        }
    });
});

app.get('/getUserRole', (req, res) => {

    res.json({ role: userInfo.role, approved: userInfo.approved });

});

app.get('/user-info', (req, res) => {
    const userId = req.query.userId; // Assuming userId is passed as a query parameter
    const fetchUserInfoQuery = `SELECT * FROM spms.users WHERE id = ${userId}`; // Adjust query according to your database schema
    db.query(fetchUserInfoQuery, (err, results) => {
      if (err) {
        console.error('Error fetching user info:', err);
        return res.status(500).send('Error fetching user info');
      }
      if (results.length === 0) {
        return res.status(404).send('User not found');
      }
      const userInfo = results[0]; // Assuming only one user is returned
      res.send(userInfo);
    });
  });
  

// Logout endpoint to clear the loggedInUserId variable
app.post('/logout', (req, res) => {
    userInfo = []; // Clear the logged-in user's ID upon logout
    res.send("Logged out successfully");
});

app.get('/', (req, res) => {
    res.send('Hello World!');
  });
  
app.post('/signUp', (req,res) => {
    const email = req.body.email;
    const password = req.body.password;
    const username = req.body.username;
    const phone_number = req.body.phone_number;
    const gender = req.body.gender;
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
                    'phone_number' : phone_number,
                    'role':'non member',
                    'gender':gender
                };
                 db.query('INSERT INTO spms.users SET ?', userdata, (err,results) => {
                    if (err) throw err;
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

app.get('/bookSlots', (req, res) => {
    const { day } = req.query;
    const query = `SELECT start_time, end_time, capacity FROM spms.slots WHERE day = ?`;
    db.query(query, [day], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.json(results);
    });
  });

  
  app.get('/slot_bookings', (req, res) => {
    const query = `SELECT * FROM spms.slot_bookings WHERE user_id = ?`;
    db.query(query,  [userInfo.id], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      res.json(results);
    });
  });

  app.post('/update_bookings', (req, res) => {
    const bookings = req.body; // Assuming the request body contains an array of bookings
    const userId = userInfo.id; // Assuming userInfo contains the currently logged-in user's ID

    // First, delete existing bookings for the user
    const deleteQuery = `DELETE FROM spms.slot_bookings WHERE user_id = ?`;
    db.query(deleteQuery, [userId], (deleteErr, deleteResults) => {
        if (deleteErr) {
            console.error('Error clearing existing bookings:', deleteErr);
            return res.status(500).json({ error: 'Internal server error' });
        }

        console.log('Existing bookings cleared successfully:', deleteResults);

        // Then, insert new bookings
        let insertQuery = 'INSERT INTO spms.slot_bookings SET ?';

        // Execute the query for each booking
        bookings.forEach(booking => {
            const values = {
                user_id: userId,
                start_time: booking.start_time,
                end_time: booking.end_time,
                date: booking.date
            };
            // Execute the query for each booking
            db.query(insertQuery, values, (err, results) => {
                if (err) {
                    console.error('Error inserting booking:', err);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                console.log('Booking inserted successfully:', results);
        });
    });

    });
});

app.delete('/delete_poolbooking',(req,res)=>{
  const {poolid} = req.query;
  console.log(poolid);
  const deleteQuery = 'DELETE FROM spms.pool_bookings WHERE id = ?';
    db.query(deleteQuery,[poolid] , (error, results) => {
        if (error) {
            console.error('Error deleting data from pool_bookings table:', error);
            res.status(500).send('Error deleting data from pool_bookings table');
            return;
        }
        // Data deleted successfully
        res.status(200).send('All data deleted from pool_bookings table');
    });
});

// const checkPoolBookingLimit = (req, res, next) => {
//     const userId = userInfo ? userInfo.id : null; // Check if userInfo is defined before accessing its properties

//     if (!userId) {
//     return res.status(400).json({ error: 'User ID is missing.' });
//     }

//     const currentMonthStart = moment().startOf('month').format('YYYY-MM-DD HH');
//     const currentMonthEnd = moment().endOf('month').format('YYYY-MM-DD HH');

//     const query = `SELECT COUNT(*) AS totalPoolBookings FROM spms.pool_bookings 
//     WHERE user_id = ? 
//     AND date >= ? 
//     AND date <= ?`;

    
//     db.query(query, [userId, currentMonthStart, currentMonthEnd], (error, results) => {
//         if (error) {
//             console.error('Error checking pool booking limit:', error);
//             return res.status(500).json({ error: 'Internal server error' });
//         }
        
//         const poolBookingCount = results[0].totalPoolBookings;
//         if (poolBookingCount >= 5) {
//             return res.status(403).json({ message: 'Maximum pool booking limit reached for this month.' });
//         }
        
//         // Store pool booking count for further processing if needed
//         req.poolBookingCount = poolBookingCount;
//         next(); // Proceed to the next middleware or route handler
//     });
// };
app.get('/pool_bookings', (req, res) => {
    const query = `SELECT * FROM spms.pool_bookings`;
    db.query(query, (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.json(results);
    });
  });

  app.post('/pool_booking', (req, res) => {
    const userId = userInfo.id; // Assuming userInfo contains the currently logged-in user's ID
    const bookings = req.body; // Assuming date, start_time, and end_time are sent in the request body

    // First, delete previous pool bookings for the user
    const deletePreviousBookingsQuery = 'DELETE FROM pool_bookings WHERE user_id = ?';
    db.query(deletePreviousBookingsQuery, [userId], (deleteError, deleteResults) => {
        if (deleteError) {
            console.error('Error deleting previous pool bookings:', deleteError);
            return res.status(500).json({ error: 'Internal server error in deleting' });
        }

        // Insert the new pool booking into the database
        let insertQuery = 'INSERT INTO spms.pool_bookings SET ?';

        // Execute the query for each booking
        bookings.forEach(booking => {
            const values = {
                user_id: userId,
                start_time: booking.start_time,
                end_time: booking.end_time, 
                date: booking.date
            };  
            // Execute the query for each booking
            db.query(insertQuery, values, (err, results) => {
                if (err) {
                    console.error('Error inserting booking:', err);
                    return res.status(500).json({ error: 'Internal server error' });
                }

                const NotifQuery = 'SELECT user_id FROM spms.slot_bookings WHERE date = ? AND start_time = ? AND end_time = ? ';
                db.query(NotifQuery, [booking.date,booking.start_time,booking.end_time], (notiferr, notifresult) => {
                  if (notiferr) {
                    console.error('Error fetching user IDs:', notiferr);
                    res.status(500).json({ err: 'Failed to fetch user IDs' });
                    return;
                  }
                  
                  console.log('User IDs fetched:', notifresult);
                  message = `Unfortunately, your slot for the date ${booking.date} during ${booking.start_time} - ${booking.end_time} has been cancelled because of a pool booking. We request you to please choose another available slot.`
                  notifresult.forEach(({ user_id }) => {
                    insertSlotNotification(user_id, message);
                  });
              
                  console.log('Slot notifications inserted.');
                });

            const cancelQuery = `DELETE FROM slot_bookings 
                                  WHERE date=?
                                  AND ((start_time >= ? AND start_time < ?) OR (end_time > ? AND end_time <= ?))`;
             db.query(cancelQuery, [booking.date, booking.start_time, booking.end_time, booking.start_time, booking.end_time], (cancelError, cancelResults) => {
                 if (cancelError) {
                     console.error('Error cancelling slots:', cancelError);
                     return res.status(500).json({ error: 'Internal server error' });
                 }

                 
                });
            });
        });
        res.status(201).json({ message: 'Pool booking successful.' });
    });
});

app.get('/requirements', async (req, res) => {
    try {
        const reqirementsQuery='SELECT * FROM spms.mem_requirements'
        db.query(reqirementsQuery,(err,results) => {
            if(err){
                console.error(err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.send(results);
        });
    }
        catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Error fetching requirements' });
          }
        
  });

  app.delete('/requirements', (req, res) => {
    // Execute a DELETE query to delete all data from the mem_requirements table
    const deleteQuery = 'DELETE FROM mem_requirements';
    db.query(deleteQuery, (error, results) => {
        if (error) {
            console.error('Error deleting data from mem_requirements table:', error);
            res.status(500).send('Error deleting data from mem_requirements table');
            return;
        }
        // Data deleted successfully
        res.status(200).send('All data deleted from mem_requirements table');
    });
});

app.post('/requirements', (req, res) => {
    const newDataArray = req.body;
    console.log(newDataArray); // Assuming request body contains an array of data to be added

    // Execute DELETE query to clear the table
    const deleteQuery = 'DELETE FROM spms.mem_requirements';
    db.query(deleteQuery, (error, results) => {
        if (error) {
            console.error('Error deleting content from mem_requirements table:', error);
            return res.status(500).send('Error deleting content from mem_requirements table');
        }

        console.log('Deleted all content from the table');

        // Loop through each item in newDataArray
        newDataArray.forEach(item => {
            if (item.hasOwnProperty('label')) {
                const label = item.label;
                const columnExistsQuery = `SELECT COUNT(*) AS count FROM information_schema.columns WHERE table_schema = 'spms' AND table_name = 'approvals' AND column_name = '${label}'`;
                db.query(columnExistsQuery, (error, results) => {
                    if (error) {
                        console.error(`Error checking column '${label}' in approvals table:`, error);
                        return res.status(500).send(`Error checking column '${label}' in approvals table`);
                    }

                    const columnExists = results[0].count > 0;

                    if (!columnExists) {
                        // If column doesn't exist, add it to the approvals table
                        const addColumnQuery = `ALTER TABLE spms.approvals ADD COLUMN ${label} VARCHAR(255)`;
                        db.query(addColumnQuery, (error, results) => {
                            if (error) {
                                console.error(`Error adding column '${label}' to approvals table:`, error);
                                return res.status(500).send(`Error adding column '${label}' to approvals table`);
                            }

                            console.log(`Added column "${label}" to approvals table`);
                        });
                    }
                });
            }
        });
        insertDataIntoRequirements();
    });

    function insertDataIntoRequirements() {
        // Prepare the values for the INSERT query
        const values = newDataArray.map(data => [data.type, data.label]); // Extract values from each item in the array

        // If columnName is not null, add it to the INSERT query
        // const columnNames = columnName ? `(${columnName}, type)` : 'type';
        const insertQuery = `INSERT INTO spms.mem_requirements (type, label) VALUES ?`;

        db.query(insertQuery, [values], (error, results) => {
            if (error) {
                console.error('Error adding data to mem_requirements table:', error);
                return res.status(500).send('Error adding data to mem_requirements table');
            }

            console.log('Data added successfully');
            res.status(200).send('Data added successfully');
        });
    }
});

app.post('/approvals', upload.none(), (req, res) => {
    const  formData = req.body;
  
    
    db.query('INSERT INTO spms.approvals SET ?', formData, (err, result) => {
      if (err) {
        console.error('Error inserting approval data into the database:', err);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      const approvalId = result.insertId; // Get the last inserted ID

    console.log('Approval data inserted into the database with ID:', approvalId);

    // Send the approval ID in the response
    res.json({ approval_id: approvalId, message: 'Application submitted successfully' });
    });
  });


app.get('/approvals/:userId', (req, res) => {
    const userId = req.params.userId;
  
    // Query the database to fetch the approval data for the user
    db.query('SELECT * FROM spms.approvals WHERE user_id = ?', [userId], (err, results) => {
        if (err) {
            console.error('Error fetching approval data from the database:', err);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
        // Check if an approval exists for the user
        if (results.length > 0) {
            const approvalData = results[0]; // Assuming only one approval per user
            res.json(approvalData);
        } else {
            res.json(null); // Return null if no approval exists for the user
        }
    });
});

app.delete('/approvals/:userId', (req, res) => {
    const userId = req.params.userId;
  
    // Delete the approval data for the user from the database
    db.query('DELETE FROM spms.approvals WHERE user_id = ?', [userId], (err, results) => {
        if (err) {
            console.error('Error deleting approval data from the database:', err);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }

        // Check if any rows were affected (if deletion was successful)
        if (results.affectedRows > 0) {
            res.json({ message: 'Approval deleted successfully' });
        } else {
            res.status(404).json({ error: 'Approval not found for the user' });
        }
    });
});

  // POST endpoint to handle file uploads
  app.post('/files', upload.single('file'), (req, res) => {
    const { label ,approval_id} = req.body;
    const { originalname, path, mimetype, size } = req.file;
    
  
    // Insert file data into the database
    const fileData = {
      approval_id: approval_id, 
      file_name: originalname,
      file_path: path,
      file_type: mimetype,
      file_size: size,
      label: label
    };
  
    db.query('INSERT INTO spms.files SET ?', fileData, (err, result) => {
      if (err) {
        console.error('Error inserting file data into the database:', err);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }
      console.log('File data inserted into the database:', result);
      res.json({ message: 'File uploaded successfully' });
    });
  });

  app.get('/user-approvals', (req, res) => {
    
    // Fetch user approvals from the database
    db.query('SELECT * FROM spms.approvals', (err, approvals) => {
      if (err) {
        console.error('Error fetching user approvals from the database:', err);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }
  
      // Send user approvals in the response
      res.json(approvals);
    });
  });
  
  // GET endpoint to retrieve files associated with a specific approval
  app.get('/approval-files/:approval_id', (req, res) => {
    const { approval_id } = req.params;
  
    // Fetch files associated with the approval from the database
    db.query('SELECT * FROM spms.files WHERE approval_id = ?', approval_id, (err, files) => {
      if (err) {
        console.error('Error fetching files associated with the approval from the database:', err);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }
  
      // Send files associated with the approval in the response
      res.json(files);
    });
  });
  
  app.get('/uploads/:fileName', (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(__dirname, 'uploads', fileName);
  
    // Set Content-Type header
    res.setHeader('Content-Type', 'application/pdf');
  
    // Send the file
    res.sendFile(filePath);
  });

  app.put('/approve-membership/:userId', async (req, res) => {
    const userId = req.params.userId;
  
    try {
        const approveQuery = `UPDATE spms.users SET approved = 1 WHERE id = ?`;
        db.query(approveQuery,[userId],(err,results)=>{
            if (err) {
                console.error('Error fetching files associated with the approval from the database:', err);
                res.status(500).json({ error: 'Internal server error' });
                return;
              }
        })
        res.status(200).json({ message: 'Membership approved successfully.' });
    } catch (error) {
      console.error('Error approving membership:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  });   

  app.put('/payMembership', async (req, res) => {
    try {
        const userId = userInfo.id; // Assuming you have access to the user's ID through req.user
        const approveQuery = `UPDATE spms.users SET role = 'member' WHERE id = ?`;
        db.query(approveQuery, [userId], (err, results) => {
            if (err) {
                console.error('Error updating user role in the database:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            userInfo.role='member';
            res.status(200).json({ message: 'Membership activated successfully.' });
        });
    } catch (error) {
        console.error('Error paying membership:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

app.delete('/delete-approval/:approvalId', async (req, res) => {
    const approvalId = req.params.approvalId;
  
    try {
      const deleteQuery = `DELETE FROM spms.approvals WHERE id = ?`;
      db.query(deleteQuery, [approvalId], (err, results) => {
        if (err) {
          console.error('Error deleting approval:', err);
          res.status(500).json({ error: 'Internal server error' });
          return;
        }
  
        res.status(200).json({ message: 'Approval deleted successfully.' });
      });
    } catch (error) {
      console.error('Error deleting approval:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

app.get('/notifications', (req, res) => {
    const user_id = userInfo.id; // Assuming user_id is provided as a query parameter
    // Fetch user-specific notifications
    const userNotificationsQuery = `
        SELECT id,date_posted, message,mark_read FROM spms.notifications WHERE user_id = ?;
    `;
    db.query(userNotificationsQuery, [user_id], (userError, userResults) => {
        if (userError) {
            console.error('Error fetching user notifications:', userError);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        const generalNotificationsQuery = `
            SELECT id,date_posted, message
            FROM spms.notifications
            WHERE user_id = 0
        `;
        db.query(generalNotificationsQuery,(generalError, generalResults) => {
            if (generalError) {
                console.error('Error fetching general notifications:', generalError);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            const notifications = {
                user_specific: userResults,
                general: generalResults
            };
            return res.status(200).json(notifications);
        });
    });
    
});

app.get('/newNotifications', (req, res) => {
  const user_id = userInfo.id; // Assuming user_id is provided as a query parameter
  // Fetch user-specific notifications
  const userNotificationsQuery = `
      SELECT id,date_posted, message,mark_read FROM spms.notifications WHERE user_id = ? AND mark_read=?;
  `;
  db.query(userNotificationsQuery, [user_id,0], (userError, userResults) => {
      if (userError) {
          console.error('Error fetching user notifications:', userError);
          return res.status(500).json({ error: 'Internal Server Error' });
      }
      const generalNotificationsQuery = `
          SELECT id,date_posted, message
          FROM spms.notifications
          WHERE user_id = 0 AND mark_read = 0
      `;
      db.query(generalNotificationsQuery,(generalError, generalResults) => {
          if (generalError) {
              console.error('Error fetching general notifications:', generalError);
              return res.status(500).json({ error: 'Internal Server Error' });
          }
          const notifications = {
              user_specific: userResults,
              general: generalResults
          };
          return res.status(200).json(notifications);
      });
  });
  
});

app.post('/events', (req, res) => {
  const { event_name, date, start_time, duration, gender, distance ,ticket_cost} = req.body;

  const NotifQuery = 'SELECT user_id FROM spms.slot_bookings WHERE date = ?';
  db.query(NotifQuery, date, (notiferr, notifresult) => {
    if (notiferr) {
      console.error('Error fetching user IDs:', notiferr);
      res.status(500).json({ err: 'Failed to fetch user IDs' });
      return;
    }

    console.log('User IDs fetched:', notifresult);
    message = `Unfortunately, your slot for the date ${date} has been cancelled because of an event. We request you to please choose another available slot.`
    notifresult.forEach(({ user_id }) => {
      insertSlotNotification(user_id, message);
    });

    console.log('Slot notifications inserted.');
  });

  const NotifPoolQuery = 'SELECT user_id FROM spms.pool_bookings WHERE date = ?';
  db.query(NotifPoolQuery, date, (notifPoolerr, notifPoolresult) => {
    if (notifPoolerr) {
      console.error('Error fetching user IDs:', notifPoolerr);
      res.status(500).json({ err: 'Failed to fetch user IDs' });
      return;
    }

    console.log('User IDs fetched:', notifPoolresult);
    message = `Unfortunately, your pool booking for the date ${date} has been cancelled because of an event. We request you to please choose another available slot.`
    notifPoolresult.forEach(({ user_id }) => {
      insertSlotNotification(user_id, message);
    });

    console.log('Pool notifications inserted.');
  });

  
  let notice = ``;
  if(gender==="Both")
  {
    notice = `A new event ${event_name} is being organized on ${date} for Male and Female. We would be glad if you participate.`
  }
  else
  {
    notice = `A new event ${event_name} is being organized on ${date} for ${gender}. We would be glad if you participate.`
  }
  const currentDate = new Date().toISOString().slice(0, 10); // Get current date
  const sql = 'INSERT INTO spms.notices (notice, date_posted) VALUES (?, ?)';
    db.query(sql, [notice, currentDate], (err, result) => {
      if (err) {
        console.error('Error creating notice:', err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        console.log('New notice created:', result);
        res.status(201).json({ message: 'Notice created successfully' });
      }
    });


  const query = 'DELETE FROM spms.slot_bookings WHERE date = ?';
  db.query(query, date, (err, result) => {
    if (err) {
      console.error('Error deleting slots:', err);
      res.status(500).json({ err: 'Failed to delete slots' });
      return;
    }

    console.log('Slots deleted:', result);
  });

  const poolQuery = 'DELETE FROM spms.pool_bookings WHERE date = ?';
  db.query(poolQuery, date, (poolerr, poolresult) => {
    if (poolerr) {
      console.error('Error deleting pool bookings:', poolerr);
      res.status(500).json({ err: 'Failed to delete pool bookings' });
      return;
    }

    console.log('Pool bookings deleted:', poolresult);
  });

  const eventData = { event_name, date, start_time, duration, gender, distance ,ticket_cost};
  // Insert event data into the events table
  db.query('INSERT INTO spms.events SET ?', eventData, (error, results) => {
    if (error) {
      console.error('Error saving event details:', error);
      res.status(500).json({ error: 'Failed to save event details' });
      return;
    }
    console.log('Event details saved:', results);
    // res.json({ message: 'Event details saved successfully' });
  });
});

app.get('/events', (req,res) => {
    const query = 'SELECT * FROM spms.events';
    db.query(query, (error, results) => {
        if(error) {
            console.error('Error fetching events:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        return res.status(200).json(results);
    });
})

app.get('/event_dates', (req,res) => {
  const query = 'SELECT date FROM spms.events';
  db.query(query, (error, results) => {
      if(error) {
          console.error('Error fetching events:', error);
          return res.status(500).json({ error: 'Internal Server Error' });
      }
      return res.status(200).json(results);
  });
})

app.get('/userInfo', (req, res) => {
    const userdata = `SELECT * from spms.users WHERE id = ?`;
    db.query(userdata, userInfo.id, (err, data1) => {
        if(err)
        {
            return res.send('Internal server error.');
        }
        console.log(data1[0]);
        res.json(data1[0]);
        // console.log(userInfo);
        //console.log(userdata[0]);
        // return res.send({ status: "Successful", userData: { id: userInfo.id, username: userInfo.username } });
    });
});

// Update user profile
app.put('/userInfo', (req, res) => {
    const { username, email,phone_number, gender } = req.body;
  
    // Update user info in MySQL
    const query = `UPDATE spms.users SET phone_number = ? , email=? , gender = ? , username = ? WHERE id = ? `;
    db.query(query, [phone_number, email,gender, username , userInfo.id], (err, results) => {
      if (err) {
        console.error('Error updating user info:', err);
        res.status(500).json({ error: 'Failed to update user info' });
        return;
      }
      console.log('User info updated successfully');
      res.status(200).json({ message: 'User info updated successfully' });
    });
  });

app.put('/password', (req, res) => {
    const {newPassword } = req.body;
    const q=validatePassword(newPassword);
    if(q==="Valid Password"){
    // Update user info in MySQL
    const query = `UPDATE spms.users SET password = ? WHERE id = ? `;
    db.query(query, [newPassword, userInfo.id], (err, results) => {
      if (err) {
        console.error('Error updating user info:', err);
        res.status(500).json({ error: 'Failed to update user info' });
        return;
      }
      console.log('User info updated successfully');
      return res.send('Succesful');
    });
    }
    else{
        return res.send(q);
    }
});
  
app.get('/slots', (req, res) => {
    const query = 'SELECT * FROM spms.slots';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching slots:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        res.json({ slots: results });
    });
});

app.get('/specialSlots', (req, res) => {
    const query = 'SELECT * FROM spms.special_slots';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching special slots:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        res.json({ slots: results });
    });
});

app.delete('/deleteSlot/:id', (req, res) => {
    const slotId = req.params.id;

    // Query to delete the slot from the special_slots table
    const sql = 'DELETE FROM spms.special_slots WHERE id = ?';

    // Execute the query
    db.query(sql, [slotId], (err, results) => {
        if (err) {
            console.error('Error deleting special slot:', err);
            return res.status(500).json({ error: 'Error deleting special slot' });
        }
        console.log('Special slot deleted successfully');
        res.status(200).json({ message: 'Special slot deleted successfully' });
    });
});

app.get('/getSpecialSlts',(req,res)=>{
    const { date } = req.query;
    const query = `SELECT start_time, end_time, capacity, type_of_slot FROM spms.special_slots WHERE date = ?`;
    console.log(date);
    db.query(query, [date], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      console.log(results);
      res.json(results);
    });
});

app.post('/addslot', (req, res) => {
    const { day, startTime, endTime } = req.body;
    const query = 'INSERT INTO spms.slots (day, start_time, end_time) VALUES (?, ?, ?)';
    db.query(query, [day, startTime, endTime], (err, results) => {
        if (err) {
            console.error('Error adding slot:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        res.json({ message: 'Slot added successfully' });
    });
});

app.post('/addSlotOnDay', (req, res) => {
    const { date, day, startTime, endTime } = req.body;

    // Check if all required fields are present
    if (!date || !day || !startTime || !endTime) {
        return res.status(400).json({ error: "Please provide date, day, startTime, and endTime" });
    }

    // Query to insert a new slot into the special_slots table
    const sql = 'INSERT INTO spms.special_slots (date, day_of_the_week, start_time, end_time, type_of_slot) VALUES (?, ?, ?, ?, ?)';
    const values = [date, day, startTime, endTime, 'add'];

    // Execute the query
    db.query(sql, values, (err, results) => {
        if (err) {
            console.error('Error adding slot:', err);
            return res.status(500).json({ error: 'Error adding slot' });
        }
        console.log('Slot added successfully');
        res.status(200).json({ message: 'Slot added successfully' });
    });
});

app.post('/deleteSlots', (req, res) => {
    const { slotIds } = req.body;

    // Check if slotIds array is provided
    if (!Array.isArray(slotIds) || slotIds.length === 0) {
        return res.status(400).json({ error: 'Please provide an array of slotIds to delete' });
    }

    // Construct SQL DELETE query with slotIds
    const sql = 'DELETE FROM spms.slots WHERE id IN (?)';
    const values = [slotIds];

    // Execute the query
    db.query(sql, values, (err, results) => {
        if (err) {
            console.error('Error deleting slots:', err);
            return res.status(500).json({ error: 'Error deleting slots' });
        }
        // console.log('Slots deleted successfully');
        res.status(200).json({ message: 'Slots deleted successfully' });
    });
});

app.post('/deleteSlotsOnDay', (req, res) => {
    const selectedSlots = req.body;

    if (selectedSlots.length === 0) {
        return res.status(400).json({ error: "No slots selected for deletion" });
    }

    // Query to delete slots from the special_slots table
    const sql = 'INSERT INTO spms.special_slots (date, day_of_the_week, start_time, end_time, type_of_slot) VALUES (?, ?, ?, ?, ?)';

    // Execute the query for each selected slot
    selectedSlots.forEach(slot => {
        const { date, day, start_time, end_time } = slot;
        const values = [date, day, start_time, end_time, 'delete'];

        db.query(sql, values, (err, results) => {
            if (err) {
                console.error('Error deleting slot from special slots:', err);
                return res.status(500).json({ error: 'Error deleting slot from special slots' });
            }
            // console.log('Slot deleted successfully');
        });
    });

    res.status(200).json({ message: 'Slots deleted successfully' });

});

app.post('/events/registerParticipation/:eventId', (req, res) => {
    const eventId = req.params.eventId;
    
    // const userId = req.body.userId; // Assuming you have the user ID in the request body
    // Query to fetch the number of available slots for the event
    // const checkSlotsQuery = 'SELECT participants FROM spms.events WHERE id = ?';
    const updateQuery = 'UPDATE spms.events SET participants = participants - 1 WHERE id = ?';
        db.query(updateQuery, [eventId], (updateErr) => {
            if (updateErr) {
                console.error('Error updating available slots:', updateErr);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            // Insert participation registration into the database
            const insertQuery = 'INSERT INTO spms.participations (event_id, user_id) VALUES (?, ?)';
            db.query(insertQuery, [eventId, userInfo.id], (insertErr, insertResults) => {
                if (insertErr) {
                    console.error('Error registering participation:', insertErr);
                    return res.status(500).json({ error: 'Internal Server Error' });
                }
                return res.status(200).json({ message: 'Participation registered successfully' });
            });
        });
});

app.post('/events/buyTickets/:eventId', (req, res) => {
  const eventId = req.params.eventId;
  const ticketsBought = parseInt(req.body.ticketsBought);
  const userId = userInfo.id; // Assuming userId is sent in the request body
  console.log(ticketsBought);
  
  if (isNaN(ticketsBought) || ticketsBought <= 0) {
    return res.status(400).json({ error: 'Invalid number of tickets bought' });
  }

  // Check if tickets already exist for this user and event
  const checkQuery = 'SELECT id, quantity FROM spms.tickets WHERE event_id = ? AND user_id = ?';
  db.query(checkQuery, [eventId, userId], (checkErr, checkResults) => {
    if (checkErr) {
      console.error('Error checking existing tickets:', checkErr);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (checkResults.length > 0) {
      // Tickets exist for this user and event, update quantity
      const existingTicket = checkResults[0];
      const newQuantity = existingTicket.quantity + ticketsBought;
      const updateQuery = 'UPDATE spms.tickets SET quantity = ? WHERE id = ?';
      db.query(updateQuery, [newQuantity, existingTicket.id], (updateErr, updateResults) => {
        if (updateErr) {
          console.error('Error updating ticket quantity:', updateErr);
          return res.status(500).json({ error: 'Internal Server Error' });
        }
        return res.status(200).json({ message: 'Ticket quantity updated successfully' });
      });
    } else {
      // No tickets found, insert new ticket booking
      const insertQuery = 'INSERT INTO spms.tickets (event_id, user_id, quantity) VALUES (?, ?, ?)';
      db.query(insertQuery, [eventId, userId, ticketsBought], (insertErr, insertResults) => {
        if (insertErr) {
          console.error('Error registering ticket booking:', insertErr);
          return res.status(500).json({ error: 'Internal Server Error' });
        }
        return res.status(200).json({ message: 'New ticket booking registered successfully' });
      });
    }
  });
});

app.get('/participations', (req, res) => {
    const userId =userInfo.id;
    // Query to fetch participation details
    const participationQuery = `
        SELECT id,event_id FROM spms.participations WHERE user_id =?`;
    // Query to fetch ticket bookings
    const ticketQuery = `
        SELECT id,event_id,quantity FROM spms.tickets WHERE user_id =?`;
    // Execute both queries
    db.query(participationQuery, [userId], (participationErr, participationResults) => {
        if (participationErr) {
            console.error('Error fetching participation details:', participationErr);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        
        db.query(ticketQuery, [userId], (ticketErr, ticketResults) => {
            if (ticketErr) {
                console.error('Error fetching ticket bookings:', ticketErr);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            // Combine participation details and ticket bookings
            const userEvents = {
                participation: participationResults,
                ticketBookings: ticketResults
            };
            // Send the combined data in the response
            res.status(200).json(userEvents);
        });
    });
});

app.delete('/participations/:id', (req, res) => {
  const participationId = req.params.id;

  // Execute the DELETE query to remove the participation from the database
  const sql = `DELETE FROM spms.participations WHERE id = ?`;
  db.query(sql, [participationId], (err, result) => {
    if (err) {
      console.error('Error deleting participation:', err);
      res.status(500).json({ error: 'Error deleting participation' });
    } else {
      console.log('Participation deleted successfully');
      res.status(200).json({ message: 'Participation deleted successfully' });
    }
  });
});

// DELETE route to cancel participation
app.delete('/tickets/:id', (req, res) => {
  const ticketId = req.params.id;
  const quantityToCancel = req.body.quantity; // Get the quantity to cancel from the request body
  console.log(req.body);

  // Get the event ID associated with the ticket to update its count
  const getEventIdQuery = 'SELECT event_id,quantity FROM spms.tickets WHERE id = ?';
  db.query(getEventIdQuery, [ticketId], (err, result) => {
    if (err) {
      console.error('Error fetching event ID:', err);
      res.status(500).send('Error canceling ticket');
    } else {
      const eventId = result[0].event_id;

      // Update the tickets count for the event
      const updateQuery = 'UPDATE spms.events SET tickets = tickets + ? WHERE id = ? ';
      db.query(updateQuery, [quantityToCancel, eventId], (updateErr, updateResults) => {
        if (updateErr) {
          console.error('Error updating available tickets:', updateErr);
          res.status(500).send('Error updating available tickets');
        } else {
          if (updateResults.affectedRows === 0) {
            return res.status(400).json({ error: 'Insufficient tickets available' });
          }
          if(quantityToCancel === result[0].quantity){
            const deleteTicketQuery = 'DELETE FROM spms.tickets WHERE id = ?';
          db.query(deleteTicketQuery, [ticketId], (deleteErr, deleteResults) => {
            if (deleteErr) {
              console.error('Error canceling ticket:', deleteErr);
              res.status(500).send('Error canceling ticket');
            } else {
              console.log('Ticket canceled successfully');
              res.status(200).send('Ticket canceled successfully');
            }
          });
          }else{
            const deleteTicketQuery = 'UPDATE spms.tickets SET quantity = quantity - ? WHERE id = ?';
          db.query(deleteTicketQuery, [quantityToCancel,ticketId], (deleteErr, deleteResults) => {
            if (deleteErr) {
              console.error('Error canceling ticket:', deleteErr);
              res.status(500).send('Error canceling ticket');
            } else {
              console.log('Ticket canceled successfully');
              res.status(200).send('Ticket canceled successfully');
            }
          });
          }
        }
      });
    }
  });
});

  app.post('/cancel-membership', (req, res) => {
    const { reason, comments } = req.body;
  
    // Assuming you have a MySQL database connection
    db.query(
      'INSERT INTO spms.cancel_reasons (user_id, reason, comment) VALUES (?, ?, ?)',
      [userInfo.id, reason, comments],
      (err, result) => {
        if (err) {
          console.error('Error inserting cancellation info:', err);
          res.status(500).send('Error cancelling membership.');
        } else {
          console.log('Cancellation info inserted successfully.');
          // Update user role in the 'users' table
          db.query(
            'UPDATE spms.users SET role = ? , approved = ?  WHERE id = ?',
            ['non member', '0',userInfo.id],
            (updateErr, updateResult) => {
              if (updateErr) {
                console.error('Error updating user role:', updateErr);
                res.status(500).send('Error updating user role.');
              } else {
                console.log('User role updated successfully.');
                res.status(200).send('Membership cancelled successfully.');
              }
            }
          );
        }
      }
    );
});

  app.get('/notices', (req, res) => {
    const sql = 'SELECT * FROM spms.notices ORDER BY id DESC';
    db.query(sql, (err, result) => {
      if (err) {
        console.error('Error fetching notices:', err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        res.json(result);
      }
    });
});

app.get('/labels', (req, res) => {
    const fetchLabelsQuery = 'SELECT label FROM spms.mem_requirements';
    db.query(fetchLabelsQuery, (err, results) => {
      if (err) {
        console.error('Error fetching labels:', err);
        return res.status(500).send('Error fetching labels');
      }
      const labels = results.map(result => result.label);
      res.json(labels);
    });
  });

app.post('/notifications', (req, res) => {
    const { userId, message } = req.body;
    console.log(userId);
    console.log(message);
    // Validate user_id and message
    if (!userId || !message) {
        console.log('error here');
      return res.status(400).json({ error: 'Invalid user_id or message' });
    }
  
    // Get current date and time
    const date_posted = new Date().toISOString().slice(0, 19).replace('T', ' ');
  
    // Insert user_id, message, and date_posted into the notifications table
    const insertQuery = `
      INSERT INTO spms.notifications (user_id, message, date_posted)
      VALUES (?, ?, ?)
    `;
    
    // Execute the insert query
    db.query(insertQuery, [userId, message, date_posted], (error, results) => {
      if (error) {
        console.error('Error inserting notification:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
      return res.status(200).json({ message: 'Notification inserted successfully' });
    });
  });

  app.put('/mark-read', (req, res) => {
    const query = `UPDATE spms.notifications SET mark_read = 1 WHERE user_id = ?`;
    db.query(query, [userInfo.id], (error, results) => {
        if (error) {
            console.error('Error updating notifications:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        console.log('Notifications marked as read successfully');
        res.status(200).json({ message: 'Notifications marked as read' });
    });
});

app.get('/cancelreasons', (req, res) => {
    const sql = 'SELECT * FROM spms.cancel_reasons';
    db.query(sql, (err, result) => {
      if (err) {
        console.error('Error fetching cancel reasons:', err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        res.json(result);
      }
    });
  });

  app.delete('/notifications/:notificationId', (req, res) => {
    const { notificationId } = req.params;
  console.log(notificationId);
    // Construct the SQL query to delete a notification with the specified ID
    const sql = `DELETE FROM spms.notifications WHERE id = ?`;
  
    // Execute the SQL query with the ID parameter
    db.query(sql, [notificationId], (err, result) => {
      if (err) {
        console.error('Error deleting notification:', err);
        res.status(500).json({ error: 'Error deleting notification' });
        return;
      }
      console.log('Notification deleted successfully');
      res.status(200).json({ message: 'Notification deleted successfully' });
    });
  });

  function insertSlotNotification(user_id, message) {
    const date_posted = new Date().toISOString().slice(0, 10).replace('T', ' '); // Get current date and time
    // Insert user_id, message, and date_posted into the notifications table
    const insertQuery = `
        INSERT INTO spms.notifications (user_id, message, date_posted)
        VALUES (?, ?, ?)
    `;
    db.query(insertQuery, [user_id, message, date_posted], (error, results) => {
        if (error) {
            console.error('Error inserting notification:', error);
            return;
        }
    });
  }

  app.post('/notices', (req, res) => {
    const { notice } = req.body;
    const currentDate = new Date().toISOString().slice(0, 10); // Get current date
    const sql = 'INSERT INTO spms.notices (notice, date_posted) VALUES (?, ?)';
    db.query(sql, [notice, currentDate], (err, result) => {
      if (err) {
        console.error('Error creating notice:', err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        console.log('New notice created:', result);
        res.status(201).json({ message: 'Notice created successfully' });
      }
    });
});

// Backend route for deleting a notice
app.delete('/notices/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'DELETE FROM spms.notices WHERE id = ?';
    db.query(sql, [id], (err, result) => {
      if (err) {
        console.error('Error deleting notice:', err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        console.log('Notice deleted:', id);
        res.status(200).json({ message: 'Notice deleted successfully' });
      }
    });
  });

  app.get('/posts', (req, res) => {
    const sql = 'SELECT * FROM spms.posts ORDER BY id'; // Ascending order by default
    db.query(sql, (err, result) => {
      if (err) {
        console.error('Error fetching posts:', err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        res.json(result);
      }
    });
  });
  // Endpoint to create a new post
app.post('/posts', (req, res) => {
    const { post } = req.body; // Extract the post content from req.body
    const username = userInfo.username;
    const sql = 'INSERT INTO spms.posts (username, post) VALUES (?, ?)';
    db.query(sql, [username, post], (err, result) => {
      if (err) {
        console.error('Error creating post:', err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        console.log('New post created:', result);
        res.status(201).json({ message: 'Post created successfully' });
      }
    });
  });
  // Endpoint to delete a post
app.delete('/posts/:id', (req, res) => {
    const postId = req.params.id;
    const sql = 'DELETE FROM spms.posts WHERE id = ?';
    db.query(sql, [postId], (err, result) => {
      if (err) {
        console.error('Error deleting post:', err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        console.log('Post deleted successfully');
        res.status(200).json({ message: 'Post deleted successfully' });
      }
    });
  });



app.listen(8000, () => console.log('running backend and listening from 8000...'));

