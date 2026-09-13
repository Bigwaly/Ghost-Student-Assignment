const express = require('express');
const mongoose = require('mongoose');
const app = express();

const port = 4555;


app.use(express.json());


const databaseConnection = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/techSchoolApp");
    console.log("Database connected successfully");
  } catch (error) {
    console.log("Database connection failed", error);
  }
}

databaseConnection();


app.get("/", (req, res) => {
  res.send("Hello World");
});

const studentSchema = new mongoose.Schema({
  name: {
    type:String,
    required: true
  },
  age: Number,

email: {
type: String,
required: true,
unique: true
},
  phone: String,

  address: String,

  course: {
  type: String,
  minlength: 2
  },

  institution: String

});

const Student = mongoose.model("Student", studentSchema);

app.post("/create-student", async (req, res) => {
  
    const { name, age, email, phone, address, course, institution } = req.body;

  try {

  const student = new Student({ name, age, email, phone, address, course, institution });
  
  await student.save();
  
  return res.status(200).json({ message: "Student created successfully", student });

} 

catch (error) {

// MongoDB error code 11000 indicates a duplicate-key violation,
// such as attempting to save an email that already exists.

  if (error.code === 11000) {

    return res.status(409).json({
        message: "Email already exists"
    });
  }

  return res.status(400).json({ 
 
    message: "Invalid student data",
    error: error.message
});
}

});


app.get("/get-students", async (req, res) => {
  try {
    const students = await Student.find();
    return res.status(200).json({ message: "Students fetched successfully", students });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
}); 


app.get("/get-student/:id", async (req, res) => {
  const { id } = req.params;

// isValid() checks whether the value can be interpreted as a MongoDB ObjectId.
// The additional 24-character hexadecimal check makes the API stricter.
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
        message: "Invalid student ID"
    });
  }

  try {
    
const student = await Student.findById(id);

if (!student) {
        return res.status(404).json({
            message: "Student not found"
        });
    }

    return res.status(200).json({ message: "Student fetched successfully", student });
  
} catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});


app.put("/update-student/:id", async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
  return res.status(400).json({
    message: "Invalid student ID"
  });
}

  const { name, age, email, phone, address, course, institution } = req.body;
  
  try {
  
    const student = await Student.findByIdAndUpdate(
        
        id, { name, age, email, phone, address, course, institution }, 
        
        { new: true });

          if (!student) {
            return res.status(404).json({
                message: "Student not found"

            });
        }
    
        return res.status(200).json({ 
            
            message: "Student updated successfully", student });

    

    } 
    
    catch (error) {
  
        return res.status(500).json({ message: "Internal server error" });
  
    }

});

app.get('/get-student-by-name', async (req, res) => {
  const { name } = req.query;

  try {
    const student = await Student.find({ name });

    if (student.length === 0) {
      return res.status(404).json({
        message: "Student not found"
      });
    }

    return res.status(200).json({
      message: "Student fetched successfully",
      student
    });

  } catch (error) {
    return res.status(500).json({
      message: "Internal server error"
    });
  }
});


app.get("/search-students", async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim() === "") {
    return res.status(400).json({
      message: "Search query is required"
    });
  }

  try {
    const students = await Student.find({
      $or: [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { course: { $regex: q, $options: "i" } }
      ]
    });

    return res.status(200).json({
      students
    });

  } catch (error) {
    return res.status(500).json({
      message: "Internal server error"
    });
  }
});



 app.patch("/students/:id/course", async (req, res) => {


	const { id } = req.params;
	const { course } = req.body;

// isValid() checks whether the value can be interpreted as an ObjectId.
// The 24-character hexadecimal check makes the API stricter.

if (!mongoose.Types.ObjectId.isValid(id)||
  !/^[a-fA-F0-9]{24}$/.test(id)) {
	
	return res.status(400).json({
		message: "Invalid student ID"
				});
			}

if (!course || course.trim() === "") {

	return res.status(400).json ({
		message: "Course is required"
				});
			}

try {

	const student = await Student.findByIdAndUpdate(
		id,
		{ course },
		{
  // new: true returns the updated document instead of the old document.
  // runValidators: true applies schema validation during the update.
  new: true,
  runValidators: true
}
		);

	if (!student) {
		return res.status(404).json({
			message: "Student not found"
				});
      }

	return res.status(200).json({
			message: "Student course updated successfully", student
				});
}

catch (error) {
	return res.status(400).json({
		message: "Invalid course",
		error: error.message
			});

}

});


app.delete("/delete-student/:id", async (req, res) => {

  const { id } = req.params;

if (!mongoose.Types.ObjectId.isValid(id)) {
  return res.status(400).json({
    message: "Invalid student ID"
  });
}

  try {
    const student =await Student.findByIdAndDelete(id);

    if (!student) {
        return res.status(404).json({
            message: "Student not found"
        });
    }
// 200 is used because the API returns a confirmation message after deletion.
    return res.status(200).json({ message: "Student deleted successfully" });
  
  } 
  
  catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

