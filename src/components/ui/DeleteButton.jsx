import React from 'react'
import { BiTrash } from 'react-icons/bi'

const DeleteButton = ({ onClick }) => {
  return (
    <div onClick={onClick} className='edit-button cursor-pointer bg-red-300 w-max p-2 rounded-md text-red-950'>
        <BiTrash />
    </div>
  )
}

export default DeleteButton