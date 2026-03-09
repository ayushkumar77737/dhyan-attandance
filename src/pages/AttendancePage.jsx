import { useState } from "react";

function AttendancePage() {

  const [users] = useState([
    "Ayush",
    "Rahul",
    "Aman",
    "Ravi"
  ])

  const [attendance,setAttendance] = useState({})

  const handleCheck = (name) => {

    setAttendance({
      ...attendance,
      [name]: !attendance[name]
    })

  }

  return (

    <div style={{padding:"40px"}}>

      <h1>Mark Dhyan Attendance</h1>

      <input type="date" />

      <table border="1" cellPadding="10">

        <thead>
          <tr>
            <th>Name</th>
            <th>Present</th>
          </tr>
        </thead>

        <tbody>

          {users.map((name,index)=>(
            <tr key={index}>
              <td>{name}</td>
              <td>
                <input
                  type="checkbox"
                  onChange={()=>handleCheck(name)}
                />
              </td>
            </tr>
          ))}

        </tbody>

      </table>

      <br />

      <button>Save Attendance</button>

    </div>

  )
}

export default AttendancePage