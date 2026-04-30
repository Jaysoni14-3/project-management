import React from 'react'
import { BiPencil } from "react-icons/bi";

const EditButton = ({ onClick }) => {
  return (
    <button onClick={onClick} className='edit-button bg-blue-300 w-max p-2 rounded-md text-blue-950'>
        <BiPencil />
    </button>
  )
}

export default EditButton