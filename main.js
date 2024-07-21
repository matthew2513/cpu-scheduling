$(document).ready(function() {
    $(".form-group-time-quantum").hide();

    // Show/Hide RR time quantum
    $('#algorithmSelector').on('change', function() {
        if (this.value === 'optRR') {
            $(".form-group-time-quantum").show(1000);
            $(".form-group-priority").hide(1000);
            $("#priorityHeader").hide(1000);
            $("#tblProcessList td:nth-child(4)").hide(1000);
        } else if (this.value === 'optPriority') {
            $(".form-group-time-quantum").hide(1000);
            $(".form-group-priority").show(1000);
            $("#priorityHeader").show(1000);
            $("#tblProcessList td:nth-child(4)").show(1000);
        }
    });

    var processList = [];

    // Adding Process
    $('#btnAddProcess').on('click', function() {
        var processID = $('#processID');
        var arrivalTime = $('#arrivalTime');
        var burstTime = $('#burstTime');
        var priority = $('#priority');

        if (processID.val() === '' || arrivalTime.val() === '' || burstTime.val() === '') {
            processID.addClass('is-invalid');
            arrivalTime.addClass('is-invalid');
            burstTime.addClass('is-invalid');
            priority.addClass('is-invalid');
            return;
        }

        var process = {
            processID: parseInt(processID.val(), 10),
            arrivalTime: parseInt(arrivalTime.val(), 10),
            burstTime: parseInt(burstTime.val(), 10),
            priority: parseInt(priority.val(), 10)
        };

        processList.push(process);

        $('#tblProcessList > tbody:last-child').append(
            `<tr>
                <td id="tdProcessID">${processID.val()}</td>
                <td id="tdArrivalTime">${arrivalTime.val()}</td>
                <td id="tdBurstTime">${burstTime.val()}</td>
                <td id="tdpriority">${priority.val()}</td>
            </tr>`
        );

        processID.val('');
        arrivalTime.val('');
        burstTime.val('');
        priority.val('');
    });

    // Calculate button
    $('#btnCalculate').on('click', function() {
        if (processList.length == 0) {
            alert('Please insert some processes');
            return;
        }

        var selectedAlgo = $('#algorithmSelector').children('option:selected').val();

        if (selectedAlgo === 'optPriority') {
            priorityScheduling();
        }

        if (selectedAlgo === 'optRR') {
            roundRobin();
        }
    });

    // Reset button
    $('#btnReset').on('click', function() {
        processList = [];
        $('#tblProcessList > tbody').empty();
        $('#tblResults > tbody').empty();
        $('#avgTurnaroundTime').val('');
        $('#avgWaitingTime').val('');
    });

    // Priority Scheduling
    function priorityScheduling() {
        var completedList = [];
        var executions = [];
        var time = 0;
        var queue = [];

        while (processList.length > 0 || queue.length > 0) {
            addToQueue();
            while (queue.length == 0 && processList.length > 0) {
                time++;
                addToQueue();
            }
            if (queue.length == 0) continue;

            var processToRun = selectProcess();
            for (var i = 0; i < processToRun.burstTime; i++) {
                time++;
                addToQueue();
            }

            // Track execution for the Gantt chart
            executions.push({
                processID: processToRun.processID,
                duration: processToRun.burstTime
            });

            processToRun.completedTime = time;
            processToRun.turnAroundTime = processToRun.completedTime - processToRun.arrivalTime;
            processToRun.waitingTime = processToRun.turnAroundTime - processToRun.burstTime;
            completedList.push(processToRun);
        }

        function addToQueue() {
            for (var i = 0; i < processList.length; i++) {
                if (processList[i].arrivalTime <= time) {
                    queue.push(processList.splice(i, 1)[0]);
                    i--;
                }
            }
        }

        function selectProcess() {
            if (queue.length != 0) {
                queue.sort(function(a, b) {
                    return b.priority - a.priority; // Higher priority first
                });
            }
            return queue.shift();
        }

        // Bind table data
        $('#tblResults > tbody').empty();
        $.each(completedList, function(key, process) {
            $('#tblResults > tbody').append(
                `<tr>
                    <td>${process.processID}</td>
                    <td>${process.completedTime}</td>
                    <td>${process.turnAroundTime}</td>
                    <td>${process.waitingTime}</td>
                </tr>`
            );
        });

        // Calculate Average TAT and WT
        var totalTurnaroundTime = 0;
        var totalWaitingTime = 0;

        $.each(completedList, function(key, process) {
            totalTurnaroundTime += process.turnAroundTime;
            totalWaitingTime += process.waitingTime;
        });

        $('#avgTurnaroundTime').val((totalTurnaroundTime / completedList.length).toFixed(2));
        $('#avgWaitingTime').val((totalWaitingTime / completedList.length).toFixed(2));

        // Draw Gantt Chart
        drawGanttChart(executions);
    }

    // Round Robin
    function roundRobin() {
        var completedList = [];
        var executions = [];
        var time = 0;
        var queue = [];
        var timeQuantum = parseInt($('#timeQuantum').val(), 10);
    
        // Ensure time quantum is valid
        if (isNaN(timeQuantum) || timeQuantum <= 0) {
            alert('Please enter a valid time quantum.');
            return;
        }
    
        // Copy processList to preserve original burst times
        var originalProcesses = processList.map(p => ({...p}));
    
        // Add processes to the queue based on arrival time
        function addToQueue() {
            while (processList.length > 0 && processList[0].arrivalTime <= time) {
                queue.push({...processList.shift()});
            }
        }
    
        // Initialize queue
        addToQueue();
    
        while (queue.length > 0) {
            var processToRun = queue.shift();
    
            // Calculate the time slice for the process
            var executionTime = Math.min(timeQuantum, processToRun.burstTime);
            processToRun.burstTime -= executionTime;
            time += executionTime;
    
            // Track execution for the Gantt chart
            executions.push({
                processID: processToRun.processID,
                duration: executionTime
            });
    
            // Check for new processes arriving during execution
            addToQueue();
    
            if (processToRun.burstTime > 0) {
                // Process not finished, add it back to the queue
                queue.push(processToRun);
            } else {
                // Process finished
                processToRun.completedTime = time;
                processToRun.turnAroundTime = processToRun.completedTime - processToRun.arrivalTime;
                processToRun.waitingTime = processToRun.turnAroundTime - originalProcesses.find(p => p.processID === processToRun.processID).burstTime;
                completedList.push(processToRun);
            }
        }
    
        // Bind table data
        $('#tblResults > tbody').empty();
        $.each(completedList, function(key, process) {
            $('#tblResults > tbody').append(
                `<tr>
                    <td>${process.processID}</td>
                    <td>${process.completedTime}</td>
                    <td>${process.turnAroundTime}</td>
                    <td>${process.waitingTime}</td>
                </tr>`
            );
        });
    
        // Calculate Average TAT and WT
        var totalTurnaroundTime = 0;
        var totalWaitingTime = 0;
    
        $.each(completedList, function(key, process) {
            totalTurnaroundTime += process.turnAroundTime;
            totalWaitingTime += process.waitingTime;
        });
    
        $('#avgTurnaroundTime').val((totalTurnaroundTime / completedList.length).toFixed(2));
        $('#avgWaitingTime').val((totalWaitingTime / completedList.length).toFixed(2));
    
        // Draw Gantt Chart
        drawGanttChart(executions);
    }

    // Function to create Gantt chart
    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }
    
    function drawGanttChart(executions) {
        const ganttChart = $('#ganttChart');
        ganttChart.empty();
    
        let currentTime = 0; // Track the current time position
        executions.forEach(execution => {
            const barWidth = execution.duration * 20;
            const barColor = getRandomColor();
            const bar = $('<div></div>')
                .addClass('process-bar')
                .text(`P${execution.processID}`)
                .css({
                    left: currentTime + 'px',
                    width: barWidth + 'px',
                    backgroundColor: barColor
                });
    
            ganttChart.append(bar);
            currentTime += barWidth;
        });
    }        
    
    // Example usage: after scheduling
    const exampleProcesses = [
        { processID: 1, burstTime: 4 },
        { processID: 2, burstTime: 6 },
        { processID: 3, burstTime: 2 }
    ];
    
    $(document).ready(function() {
        drawGanttChart(exampleProcesses);
    });  
});
