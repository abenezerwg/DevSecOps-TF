    document.addEventListener('DOMContentLoaded', () => {
      fetchData(); // Initial data fetch

      // Set up automatic refresh every 5 seconds (5000 milliseconds)
      setInterval(fetchData, 5000);
    });

    function fetchData() {
      const dataList = document.getElementById('dataList');

      // Using XMLHttpRequest (you can also use fetch API)
      const xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            displayData(data);
          } else {
            console.error('Error fetching data:', xhr.statusText);
          }
        }
      };

      xhr.open('GET', '/getData', true);
      xhr.send();
    }

    function displayData(data) {
      const dataList = document.getElementById('dataList');

      // Clear existing data
      dataList.innerHTML = '';

      // Display all data
      data.forEach(group => {
        const listItem = document.createElement('li');
        listItem.textContent = `GroupName: ${group.name}, Name: ${group.createdBy}`;
        dataList.appendChild(listItem);
      });
    }