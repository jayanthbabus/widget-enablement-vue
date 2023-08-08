<template>
    <div class="loader-overlay">
      <div class="loader-container">
        <div class="loader"></div>
        <div class="loading-message">Data is loading, please wait...</div>
      </div>
    </div>
  </template>
  
  <style>
  .loader-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.2); /* Light black background */
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .loader-container {
    background-color: #fff;
    padding: 20px;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  }
  
  .loader {
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 2s linear infinite;
  }
  
  .loading-message {
    margin-top: 16px;
    font-size: 14px;
    color: #333;
  }
  </style>
  