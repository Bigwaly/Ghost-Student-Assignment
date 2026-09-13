# Ghost Student Assignment

## Part A — My answers

### 1. Why does `/get-student-by-name?name=Ada` return an array?

The route uses:

```js
const student = await Student.find({ name });
```

`Student.find()` returns an array containing **all documents that match the query**.

Therefore, if there are two students named `Ada`, both students will be returned inside the array.

For example:

```json
{
  "student": [
    {
      "name": "Ada",
      "email": "ada@example.com"
    },
    {
      "name": "Ada",
      "email": "ada2@example.com"
    }
  ]
}
```

`find()` is appropriate when I want to retrieve all matching documents.

`findOne()` is different because it returns only one matching document, or `null` if no document matches.

Therefore:

- Use `find()` when multiple matching students may be needed.
- Use `findOne()` when only one matching document is required.

---

### 2. Why does `ada` or `Ada ` not match `Ada`?

The original route uses:

```js
Student.find({ name });
```

This performs an exact comparison. Therefore, values such as:

```text
Ada
ada
Ada 
ADA
```

can be treated as different values because of differences in case or whitespace.

For a case-insensitive search, MongoDB can perform the matching directly in the database using a regular expression:

```js
{
  name: {
    $regex: q,
    $options: "i"
  }
}
```

The `"i"` option makes the search case-insensitive.

I used this approach in the `/search-students?q=...` route so that the database performs the search instead of loading the entire collection into JavaScript and filtering it with `.filter()`.

The search route searches across:

- `name`
- `email`
- `course`

---

### 3. Why might the PUT update appear to show the old document?

The update route is:

```text
PUT /update-student/:id
```

The student ID is expected to be supplied in the URL.

One possible reason an administrator could see the old document is that the request was sent incorrectly, for example:

- Using the wrong HTTP method.
- Using the wrong URL.
- Supplying the wrong student ID.
- Sending the ID in the request body instead of the URL.
- Sending fields that were not intended to be updated.

The route uses:

```js
Student.findByIdAndUpdate(
  id,
  { name, age, email, phone, address, course, institution },
  { new: true }
);
```

By default, `findByIdAndUpdate()` can return the document as it existed before the update.

The option:

```js
{ new: true }
```

tells Mongoose to return the **updated document** instead.

The `runValidators: true` option can also be used when validation should be applied to update operations.

---

### 4. Why does an invalid ID cause a 500 error while a valid-looking nonexistent ID should return 404?

There are two different situations.

#### Valid ObjectId but student does not exist

For example:

```text
507f1f77bcf86cd799439011
```

This has the correct ObjectId format, but if no student has that ID, `findById()` returns:

```js
null
```

The API should therefore return:

```text
404 Not Found
```

because the ID is valid but the requested student does not exist.

#### Invalid ObjectId

For example:

```text
abc123
```

This is not a valid MongoDB ObjectId.

If it is passed directly to:

```js
Student.findById(id);
```

Mongoose can throw a `CastError` because it cannot convert the supplied value into an ObjectId.

If that error is handled as a general server error, the API may return:

```text
500 Internal Server Error
```

The better approach is to validate the ID before querying the database.

The route therefore checks:

```js
mongoose.Types.ObjectId.isValid(id)
```

and also checks that the ID contains exactly 24 hexadecimal characters.

An invalid ID now returns:

```text
400 Bad Request
```

while a valid but nonexistent ID returns:

```text
404 Not Found
```

This separates a bad request from a missing resource.

---

### 5. Which MongoDB collection does `mongoose.model("Student", studentSchema)` use?

The application creates the model using:

```js
const Student = mongoose.model("Student", studentSchema);
```

Mongoose normally converts the model name to lowercase and pluralizes it when selecting the default MongoDB collection.

Therefore:

```text
Student
```

normally maps to:

```text
students
```

So the application is expected to use the MongoDB collection:

```text
students
```

If I manually query a different collection, such as:

```text
student
```

instead of:

```text
students
```

I may see no documents even though the API is working correctly.

This can make the API appear empty when the actual problem is that the wrong MongoDB collection is being inspected.

---

### 6. What happens if `Content-Type: application/json` is missing?

The application contains:

```js
app.use(express.json());
```

This middleware allows Express to parse JSON request bodies and make the data available through:

```js
req.body
```

For example, a POST request can send:

```json
{
  "name": "Ada",
  "age": 20,
  "email": "ada@example.com"
}
```

with the header:

```text
Content-Type: application/json
```

If the request does not have the correct content type, Express may not parse the body as JSON.

This can result in `req.body` being missing or not containing the expected values.

For example, the following code depends on the JSON body being correctly parsed:

```js
const { name, age, email, phone, address, course, institution } = req.body;
```

Missing or incorrectly formatted request data can therefore result in missing fields, destructuring problems, or Mongoose validation errors.

---

# Part B — Implementation

The following changes were implemented in `app.js`.

## 1. Database-side student search

Added:

```text
GET /search-students?q=...
```

The endpoint searches the following fields:

- `name`
- `email`
- `course`

The search is case-insensitive and uses MongoDB's `$regex` operator.

Example:

```text
GET /search-students?q=ada
```

The database performs the matching directly.

The implementation does not retrieve the entire collection and then use JavaScript `.filter()`.

If the search query is missing or empty, the API returns:

```text
400 Bad Request
```

If there are no matching students, the endpoint returns:

```text
200 OK
```

with an empty array.

---

## 2. Hardened GET student by ID

The existing endpoint:

```text
GET /get-student/:id
```

was improved to distinguish between invalid IDs and students that do not exist.

### Invalid ID

Example:

```text
GET /get-student/abc123
```

Response:

```text
400 Bad Request
```

### Valid ID but student does not exist

Response:

```text
404 Not Found
```

### Valid ID and student exists

Response:

```text
200 OK
```

The implementation uses:

```js
mongoose.Types.ObjectId.isValid(id)
```

together with a 24-character hexadecimal check.

---

## 3. PATCH course endpoint

Added:

```text
PATCH /students/:id/course
```

The endpoint updates only the student's course.

Example request:

```json
{
  "course": "Computer Science"
}
```

The endpoint uses:

```js
{
  new: true,
  runValidators: true
}
```

`new: true` returns the updated student document.

`runValidators: true` makes Mongoose apply schema validation during the update.

The `course` field has a minimum length of 2:

```js
course: {
  type: String,
  minlength: 2
}
```

Therefore:

```json
{
  "course": "A"
}
```

is rejected with:

```text
400 Bad Request
```

instead of becoming a 500 server error.

A valid but nonexistent student ID returns:

```text
404 Not Found
```

---

## 4. Unique email handling

The student schema contains:

```js
email: {
  type: String,
  required: true,
  unique: true
}
```

This prevents duplicate email values from being stored once the corresponding MongoDB unique index is established.

MongoDB uses error code:

```text
11000
```

for a duplicate-key violation.

The application checks for this error:

```js
if (error.code === 11000) {
  return res.status(409).json({
    message: "Email already exists"
  });
}
```

Therefore, attempting to create a second student with an existing email returns:

```text
409 Conflict
```

instead of a generic 500 error.

---

## 5. Honest DELETE behaviour

The delete endpoint is:

```text
DELETE /delete-student/:id
```

It handles three situations.

### Invalid ID

Returns:

```text
400 Bad Request
```

### Valid ID but student does not exist

Returns:

```text
404 Not Found
```

### Student exists and is deleted

Returns:

```text
200 OK
```

with a confirmation message.

I used `200 OK` instead of `204 No Content` because the API returns a confirmation message after the deletion.

---

# Part C — Test Results

All required tests were performed successfully.

| Test | Expected Result | Result |
|---|---|---|
| Search with `q=ada` finds Ada and ADA | 200 and multiple matching students | PASS |
| Search without `q` | 400 Bad Request | PASS |
| GET `/get-student/abc123` | 400 Bad Request | PASS |
| GET with valid-looking nonexistent ID | 404 Not Found | PASS |
| PATCH real student course | 200 and updated student returned | PASS |
| PATCH with `course: "A"` | 400 validation error | PASS |
| Create two students with same email | Second request returns 409 Conflict | PASS |
| Delete nonexistent student | 404 Not Found | PASS |

---

# Research and Code Comments

The implementation includes comments explaining the important researched concepts.

### ObjectId validation

`mongoose.Types.ObjectId.isValid()` is used to check whether an ID can be interpreted as a MongoDB ObjectId.

An additional 24-character hexadecimal check was included in the GET-by-ID route to make the validation stricter.

### `new: true`

The `new: true` option in `findByIdAndUpdate()` causes Mongoose to return the updated document instead of the document as it existed before the update.

### `runValidators: true`

The `runValidators: true` option applies the schema's validation rules during an update operation.

### MongoDB error 11000

MongoDB error code `11000` represents a duplicate-key violation, which is used here to detect duplicate student email addresses.

### DELETE status code

The DELETE endpoint returns `200 OK` because the API sends a confirmation message after successfully deleting the student.

---

# Existing Routes

The assignment keeps the existing routes while adding the required functionality:

```text
GET  /
POST /create-student
GET  /get-students
GET  /get-student/:id
PUT  /update-student/:id
GET  /get-student-by-name
GET  /search-students
PATCH /students/:id/course
DELETE /delete-student/:id
```

The application continues to use:

```text
Port: 4555
Database: mongodb://localhost:27017/techSchoolApp
```

---

# Submission

The main implementation is contained in:

```text
app.js
```

This README contains the Part A explanations, Part B implementation summary, research notes, and Part C test results required for the assignment.