import React from 'react'

const AuthCard = ({ title, children }) => {
  return (
    <div>
        <h1 className='text-text-primary text-page text-center'>{title}</h1>
        <div className='bg-surface border border-border rounded-lg shadow-card p-lg my-lg'>
            {children}
        </div>
    </div>
  )
}

export default AuthCard