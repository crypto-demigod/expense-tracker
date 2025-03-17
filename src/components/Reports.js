import { useState, useEffect, useRef } from 'react';
import { useExpenses, EXPENSE_CATEGORIES } from '../context/ExpenseContext';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Register ChartJS components
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  PointElement, 
  LineElement
);

const Reports = () => {
  const { expenses } = useExpenses();
  const [reportType, setReportType] = useState('monthly');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [category, setCategory] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [preferredExportFormat, setPreferredExportFormat] = useState('csv');
  const [isExporting, setIsExporting] = useState(false);
  
  // Add state for export options dialog
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [currentExportType, setCurrentExportType] = useState(null);
  const [exportOptions, setExportOptions] = useState({
    includeSummary: true,
    includeChart: true,
    includeDetails: true,
    maxItems: 'all',
    dateFrom: '',
    dateTo: ''
  });
  
  // Reference to close the export menu when options dialog is shown
  const menuRef = useRef(null);
  
  // Load preferred export format from localStorage on component mount
  useEffect(() => {
    const savedFormat = localStorage.getItem('preferredExportFormat');
    if (savedFormat) {
      setPreferredExportFormat(savedFormat);
    }
    
    // Add keyboard shortcut for export
    const handleKeyDown = (e) => {
      // Ctrl+E or Cmd+E (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        // Show export options dialog with preferred format selected
        handleExportClick(preferredExportFormat);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [preferredExportFormat]);
  
  // Add click outside handler for export menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    };
    
    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);
  
  // Format amount
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  // Get month name
  const getMonthName = (monthIndex) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthIndex];
  };
  
  // Get years from expenses
  const getYears = () => {
    const years = new Set();
    expenses.forEach(expense => {
      const expenseYear = new Date(expense.date).getFullYear();
      years.add(expenseYear);
    });
    
    // If no years found, add current year
    if (years.size === 0) {
      years.add(new Date().getFullYear());
    }
    
    return Array.from(years).sort((a, b) => b - a); // Sort descending
  };
  
  // Filter expenses based on report type and selected filters
  const getFilteredExpenses = () => {
    let filtered = [...expenses];
    
    // Filter by category if selected
    if (category) {
      filtered = filtered.filter(expense => expense.category === category);
    }
    
    // Filter by time period
    switch (reportType) {
      case 'monthly':
        filtered = filtered.filter(expense => {
          const expenseDate = new Date(expense.date);
          return expenseDate.getFullYear() === year && expenseDate.getMonth() === month;
        });
        break;
      case 'yearly':
        filtered = filtered.filter(expense => {
          const expenseDate = new Date(expense.date);
          return expenseDate.getFullYear() === year;
        });
        break;
      case 'category':
        // No additional time filtering for category report
        break;
      default:
        break;
    }
    
    return filtered;
  };
  
  // Generate monthly report data
  const generateMonthlyReportData = () => {
    const filteredExpenses = getFilteredExpenses();
    
    // Group expenses by day
    const expensesByDay = {};
    
    filteredExpenses.forEach(expense => {
      const day = new Date(expense.date).getDate();
      if (!expensesByDay[day]) {
        expensesByDay[day] = 0;
      }
      expensesByDay[day] += expense.amount;
    });
    
    // Get days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Prepare data for chart
    const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const data = labels.map(day => expensesByDay[day] || 0);
    
    return {
      labels,
      datasets: [
        {
          label: 'Daily Expenses',
          data,
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
      ],
    };
  };
  
  // Generate yearly report data
  const generateYearlyReportData = () => {
    const filteredExpenses = getFilteredExpenses();
    
    // Group expenses by month
    const expensesByMonth = Array(12).fill(0);
    
    filteredExpenses.forEach(expense => {
      const month = new Date(expense.date).getMonth();
      expensesByMonth[month] += expense.amount;
    });
    
    // Prepare data for chart
    const labels = Array.from({ length: 12 }, (_, i) => getMonthName(i));
    
    return {
      labels,
      datasets: [
        {
          label: 'Monthly Expenses',
          data: expensesByMonth,
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
      ],
    };
  };
  
  // Generate category report data
  const generateCategoryReportData = () => {
    const filteredExpenses = getFilteredExpenses();
    
    // Group expenses by category
    const expensesByCategory = {};
    
    filteredExpenses.forEach(expense => {
      const category = expense.category || 'uncategorized';
      if (!expensesByCategory[category]) {
        expensesByCategory[category] = 0;
      }
      expensesByCategory[category] += expense.amount;
    });
    
    // Prepare data for chart
    const categories = Object.keys(expensesByCategory);
    const data = categories.map(cat => expensesByCategory[cat]);
    const labels = categories.map(catId => {
      const category = EXPENSE_CATEGORIES.find(c => c.id === catId);
      return category ? `${category.icon} ${category.name}` : 'Uncategorized';
    });
    
    return {
      labels,
      datasets: [
        {
          label: 'Expenses by Category',
          data,
          backgroundColor: [
            'rgba(255, 99, 132, 0.5)',
            'rgba(54, 162, 235, 0.5)',
            'rgba(255, 206, 86, 0.5)',
            'rgba(75, 192, 192, 0.5)',
            'rgba(153, 102, 255, 0.5)',
            'rgba(255, 159, 64, 0.5)',
            'rgba(255, 99, 132, 0.5)',
            'rgba(54, 162, 235, 0.5)',
            'rgba(255, 206, 86, 0.5)',
            'rgba(75, 192, 192, 0.5)',
            'rgba(153, 102, 255, 0.5)',
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };
  };
  
  // Get chart data based on report type
  const getChartData = () => {
    switch (reportType) {
      case 'monthly':
        return generateMonthlyReportData();
      case 'yearly':
        return generateYearlyReportData();
      case 'category':
        return generateCategoryReportData();
      default:
        return { labels: [], datasets: [] };
    }
  };
  
  // Get chart options
  const getChartOptions = () => {
    const baseOptions = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.raw || 0;
              return `${formatAmount(value)}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => formatAmount(value),
          },
        },
      },
    };
    
    return baseOptions;
  };
  
  // Get report summary
  const getReportSummary = () => {
    const filteredExpenses = getFilteredExpenses();
    
    if (filteredExpenses.length === 0) {
      return {
        total: 0,
        average: 0,
        count: 0,
        highest: { amount: 0, title: 'N/A' },
        lowest: { amount: 0, title: 'N/A' },
      };
    }
    
    const total = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const average = total / filteredExpenses.length;
    
    // Find highest and lowest expenses
    let highest = filteredExpenses[0];
    let lowest = filteredExpenses[0];
    
    filteredExpenses.forEach(expense => {
      if (expense.amount > highest.amount) {
        highest = expense;
      }
      if (expense.amount < lowest.amount) {
        lowest = expense;
      }
    });
    
    return {
      total,
      average,
      count: filteredExpenses.length,
      highest,
      lowest,
    };
  };
  
  // New function: Generate CSV data for export
  const generateCSVData = (filteredExpenses) => {
    // Define columns based on the expense properties
    const columns = ['Date', 'Title', 'Category', 'Amount', 'Notes', 'Recurring'];
    
    // Create CSV header row
    let csv = columns.join(',') + '\n';
    
    // Add data rows
    filteredExpenses.forEach(expense => {
      const categoryObj = EXPENSE_CATEGORIES.find(cat => cat.id === expense.category);
      const categoryName = categoryObj ? categoryObj.name : 'Uncategorized';
      
      const formattedDate = new Date(expense.date).toLocaleDateString();
      const formattedAmount = expense.amount.toFixed(2);
      
      // Escape strings that might contain commas
      const row = [
        formattedDate,
        escapeCsvValue(expense.title),
        escapeCsvValue(categoryName),
        formattedAmount,
        escapeCsvValue(expense.notes),
        expense.isRecurring ? 'Yes' : 'No',
      ];
      
      csv += row.join(',') + '\n';
    });
    
    return csv;
  };
  
  // New function: Generate summary CSV for specific report types
  const generateSummaryCSV = () => {
    const summaryData = summary;
    const reportTitle = reportType === 'monthly'
      ? `Expenses for ${getMonthName(month)} ${year}`
      : reportType === 'yearly'
      ? `Expenses for ${year}`
      : 'Expenses by Category';
      
    let csv = `${reportTitle}\n\n`;
    
    // Add summary data
    csv += `Total Expenses,${summaryData.total.toFixed(2)}\n`;
    csv += `Average Expense,${summaryData.average.toFixed(2)}\n`;
    csv += `Number of Expenses,${summaryData.count}\n`;
    csv += `Highest Expense,${summaryData.highest.amount.toFixed(2)},${escapeCsvValue(summaryData.highest.title || 'N/A')}\n`;
    csv += `Lowest Expense,${summaryData.lowest.amount.toFixed(2)},${escapeCsvValue(summaryData.lowest.title || 'N/A')}\n\n`;
    
    // For category reports, add category breakdown
    if (reportType === 'category') {
      csv += 'Category,Amount\n';
      
      // Get data from chart
      const categories = chartData.labels;
      const amounts = chartData.datasets[0].data;
      
      categories.forEach((category, index) => {
        csv += `${escapeCsvValue(category)},${amounts[index].toFixed(2)}\n`;
      });
    }
    
    // For monthly or yearly reports, add time-based breakdown
    else {
      const periodLabel = reportType === 'monthly' ? 'Day' : 'Month';
      csv += `${periodLabel},Amount\n`;
      
      // Get data from chart
      const periods = chartData.labels;
      const amounts = chartData.datasets[0].data;
      
      periods.forEach((period, index) => {
        csv += `${period},${amounts[index].toFixed(2)}\n`;
      });
    }
    
    return csv;
  };
  
  // Helper function to escape CSV values
  const escapeCsvValue = (value) => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    // If the value contains commas, quotes, or newlines, wrap it in quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      // Replace any quotes with double quotes
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };
  
  // Handle showing the export options dialog
  const handleExportClick = (type) => {
    setCurrentExportType(type);
    setShowExportOptions(true);
    setShowExportMenu(false);
  };
  
  // Handle changes to export options
  const handleOptionChange = (e) => {
    const { name, value, type, checked } = e.target;
    setExportOptions({
      ...exportOptions,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  // Handle the actual export after options are selected
  const processExport = () => {
    if (!currentExportType) return;
    
    // First close the options dialog
    setShowExportOptions(false);
    
    // Set exporting state
    setIsExporting(true);
    
    try {
      // Process the export with the selected options
      exportReportData(currentExportType, exportOptions);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export. Please try again.');
    } finally {
      // We'll set this with a slight delay to allow the UI to update
      setTimeout(() => {
        setIsExporting(false);
      }, 500);
    }
  };
  
  // Update the exportReportData function to accept options
  const exportReportData = (type = 'csv', options = exportOptions) => {
    let filteredExpenses = getFilteredExpenses();
    
    // Apply additional date filtering if specified in export options
    if (options.dateFrom) {
      const fromDate = new Date(options.dateFrom);
      filteredExpenses = filteredExpenses.filter(exp => 
        new Date(exp.date) >= fromDate
      );
    }
    
    if (options.dateTo) {
      const toDate = new Date(options.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filteredExpenses = filteredExpenses.filter(exp => 
        new Date(exp.date) <= toDate
      );
    }
    
    // Limit number of items if specified
    if (options.maxItems !== 'all') {
      const maxItems = parseInt(options.maxItems);
      if (!isNaN(maxItems) && maxItems > 0) {
        // Sort by date descending before limiting
        filteredExpenses = [...filteredExpenses]
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, maxItems);
      }
    }
    
    // Save preferred format to localStorage
    if (type !== preferredExportFormat) {
      setPreferredExportFormat(type);
      localStorage.setItem('preferredExportFormat', type);
    }
    
    // Create a filename based on report type
    let filename = 'expense-report';
    if (reportType === 'monthly') {
      filename = `expense-report-${getMonthName(month).toLowerCase()}-${year}`;
    } else if (reportType === 'yearly') {
      filename = `expense-report-${year}`;
    } else if (reportType === 'category') {
      filename = 'expense-report-by-category';
      if (category) {
        const categoryObj = EXPENSE_CATEGORIES.find(cat => cat.id === category);
        if (categoryObj) {
          filename = `expense-report-${categoryObj.name.toLowerCase().replace(/\s+/g, '-')}`;
        }
      }
    }
    
    // Handle different export types
    switch (type) {
      case 'csv':
        exportToCSV(filteredExpenses, filename, options);
        break;
      case 'excel':
        exportToExcel(filteredExpenses, filename, options);
        break;
      case 'pdf':
        exportToPDF(filename, options);
        break;
      default:
        exportToCSV(filteredExpenses, filename, options);
    }
  };
  
  // Update the export functions to use options
  const exportToCSV = (filteredExpenses, filename, options) => {
    // Create a complete report with summary and details
    let csv = '';
    
    // Add the summary data if included in options
    if (options.includeSummary) {
      csv += generateSummaryCSV();
    }
    
    // Add a separator
    if (options.includeSummary && options.includeDetails) {
      csv += '\nDETAILED EXPENSES\n\n';
    }
    
    // Add the detailed expense data if included in options
    if (options.includeDetails) {
      csv += generateCSVData(filteredExpenses);
    }
    
    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create a link element to download the file
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Update exportToExcel to use options
  const exportToExcel = (filteredExpenses, filename, options) => {
    try {
      // Create workbook
      const wb = utils.book_new();
      
      // Create summary worksheet if included in options
      if (options.includeSummary) {
        // Create summary data
        const summaryData = [
          [reportType === 'monthly'
            ? `Expenses for ${getMonthName(month)} ${year}`
            : reportType === 'yearly'
            ? `Expenses for ${year}`
            : 'Expenses by Category'],
          [],
          ['Total Expenses', summary.total.toFixed(2)],
          ['Average Expense', summary.average.toFixed(2)],
          ['Number of Expenses', summary.count],
          ['Highest Expense', summary.highest.amount.toFixed(2), summary.highest.title || 'N/A'],
          ['Lowest Expense', summary.lowest.amount.toFixed(2), summary.lowest.title || 'N/A'],
          []
        ];
        
        // Add chart data to summary
        if (reportType === 'category') {
          summaryData.push(['Category', 'Amount']);
          
          // Get data from chart
          const categories = chartData.labels;
          const amounts = chartData.datasets[0].data;
          
          categories.forEach((category, index) => {
            summaryData.push([category, amounts[index].toFixed(2)]);
          });
        } else {
          const periodLabel = reportType === 'monthly' ? 'Day' : 'Month';
          summaryData.push([periodLabel, 'Amount']);
          
          // Get data from chart
          const periods = chartData.labels;
          const amounts = chartData.datasets[0].data;
          
          periods.forEach((period, index) => {
            summaryData.push([period, amounts[index].toFixed(2)]);
          });
        }
        
        // Create summary worksheet and add to workbook
        const wsSummary = utils.aoa_to_sheet(summaryData);
        utils.book_append_sheet(wb, wsSummary, 'Summary');
        
        // Set column widths for summary worksheet
        const setCellWidths = (worksheet, widths) => {
          const colInfo = widths.map(w => ({ width: w }));
          worksheet['!cols'] = colInfo;
        };
        
        setCellWidths(wsSummary, [25, 15, 40]);
        
        // Style the header cells for both worksheets
        const styleHeaders = (worksheet, range) => {
          for (let col = 0; col < range; col++) {
            const cellRef = utils.encode_cell({ r: 0, c: col });
            if (!worksheet[cellRef]) continue;
            
            worksheet[cellRef].s = {
              font: { bold: true, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "4F81BD" } },
              alignment: { horizontal: "center" }
            };
          }
        };
        
        // Style the title in summary sheet
        const titleCell = utils.encode_cell({ r: 0, c: 0 });
        wsSummary[titleCell].s = {
          font: { bold: true, sz: 14, color: { rgb: "000000" } },
          alignment: { horizontal: "center" }
        };
        
        // Merge cells for title if needed
        wsSummary['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } } // Merge A1:C1
        ];
        
        // Format currency columns in summary worksheet
        const formatSummaryCurrency = () => {
          // Format total, average, highest, lowest amounts
          for (let i = 2; i <= 6; i++) {
            if (i === 4) continue; // Skip the count row
            const amountCell = utils.encode_cell({ r: i, c: 1 });
            if (!wsSummary[amountCell]) continue;
            wsSummary[amountCell].z = '$#,##0.00';
          }
          
          // Format chart data amounts
          const chartDataStartRow = 8;
          for (let i = chartDataStartRow + 1; i < summaryData.length; i++) {
            const amountCell = utils.encode_cell({ r: i, c: 1 });
            if (!wsSummary[amountCell]) continue;
            wsSummary[amountCell].z = '$#,##0.00';
          }
        };
        
        formatSummaryCurrency();
      }
      
      // Create detailed expenses worksheet if included in options
      if (options.includeDetails) {
        // Create detailed expenses worksheet
        const wsData = [
          ['Date', 'Title', 'Category', 'Amount', 'Notes', 'Recurring'],
          ...filteredExpenses.map(expense => {
            const categoryObj = EXPENSE_CATEGORIES.find(cat => cat.id === expense.category);
            return [
              new Date(expense.date).toLocaleDateString(),
              expense.title,
              categoryObj ? categoryObj.name : 'Uncategorized',
              expense.amount,
              expense.notes || '',
              expense.isRecurring ? 'Yes' : 'No'
            ];
          })
        ];
        
        // Create expenses worksheet and add to workbook
        const wsExpenses = utils.aoa_to_sheet(wsData);
        utils.book_append_sheet(wb, wsExpenses, 'Expenses');
        
        // Set column widths for expenses worksheet
        const setCellWidths = (worksheet, widths) => {
          const colInfo = widths.map(w => ({ width: w }));
          worksheet['!cols'] = colInfo;
        };
        
        setCellWidths(wsExpenses, [15, 25, 20, 15, 40, 15]);
        
        // Style the header cells
        const styleHeaders = (worksheet, range) => {
          for (let col = 0; col < range; col++) {
            const cellRef = utils.encode_cell({ r: 0, c: col });
            if (!worksheet[cellRef]) continue;
            
            worksheet[cellRef].s = {
              font: { bold: true, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "4F81BD" } },
              alignment: { horizontal: "center" }
            };
          }
        };
        
        // Apply header styling
        styleHeaders(wsExpenses, 6);
        
        // Format currency columns in expenses worksheet
        const formatExpensesCurrency = () => {
          for (let i = 1; i < wsData.length; i++) {
            const amountCell = utils.encode_cell({ r: i, c: 3 });
            if (!wsExpenses[amountCell]) continue;
            wsExpenses[amountCell].z = '$#,##0.00';
          }
        };
        
        formatExpensesCurrency();
      }
      
      // Write to file
      writeFile(wb, `${filename}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export to Excel. Please try again later.');
    }
  };
  
  // Update exportToPDF to use options
  const exportToPDF = async (filename, options) => {
    try {
      // Get the report container
      const reportElement = document.getElementById('expense-report-container');
      if (!reportElement) {
        throw new Error('Report container element not found');
      }
      
      // Add a loading indicator
      const loadingIndicator = document.createElement('div');
      loadingIndicator.style.position = 'fixed';
      loadingIndicator.style.top = '50%';
      loadingIndicator.style.left = '50%';
      loadingIndicator.style.transform = 'translate(-50%, -50%)';
      loadingIndicator.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
      loadingIndicator.style.padding = '20px';
      loadingIndicator.style.borderRadius = '5px';
      loadingIndicator.style.zIndex = '9999';
      loadingIndicator.innerHTML = '<p>Generating PDF...</p>';
      document.body.appendChild(loadingIndicator);
      
      // Add a temporary class to style for print
      reportElement.classList.add('pdf-export-mode');
      
      // Create a PDF with A4 dimensions
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Title for the report
      const title = reportType === 'monthly'
        ? `Expense Report - ${getMonthName(month)} ${year}`
        : reportType === 'yearly'
        ? `Expense Report - ${year}`
        : 'Expense Report - By Category';
      
      // Get the main sections of the report for pagination
      const sections = [
        document.querySelector('.flex.justify-between.items-center'), // Title section
        document.querySelector('.bg-white.p-4.rounded-lg.shadow'), // Controls section
        document.querySelector('.grid.grid-cols-1.md\\:grid-cols-4.gap-4'), // Summary section
        document.querySelector('.bg-white.p-4.rounded-lg.shadow:nth-of-type(2)') // Chart section
      ].filter(Boolean);
      
      let pageCount = 0;
      
      // Function to add a page with header and footer
      const addPageWithHeaderFooter = () => {
        if (pageCount > 0) {
          pdf.addPage();
        }
        pageCount++;
        
        // Add title/header to each page
        pdf.setFontSize(16);
        pdf.setTextColor(0, 0, 0);
        pdf.text(title, pdfWidth / 2, 15, { align: 'center' });
        
        // Add a subtle header line
        pdf.setDrawColor(200, 200, 200);
        pdf.line(10, 20, pdfWidth - 10, 20);
        
        // Add footer
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        const dateStr = new Date().toLocaleDateString();
        pdf.text(`Generated on ${dateStr}`, 10, pdfHeight - 10);
        pdf.text(`Page ${pageCount}`, pdfWidth - 20, pdfHeight - 10);
      };
      
      // Add first page with header
      addPageWithHeaderFooter();
      
      // Current Y position for content
      let yPosition = 30;
      const contentWidth = pdfWidth - 20;
      const marginX = 10;
      
      // Add report summary if requested
      if (options.includeSummary) {
        pdf.setFontSize(14);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Report Summary', marginX, yPosition);
        yPosition += 10;
        
        // Add summary data
        pdf.setFontSize(11);
        const summaryItems = [
          `Total Expenses: ${formatAmount(summary.total)}`,
          `Average Expense: ${formatAmount(summary.average)}`,
          `Number of Expenses: ${summary.count}`,
          `Highest Expense: ${formatAmount(summary.highest.amount)} (${summary.highest.title || 'N/A'})`,
          `Lowest Expense: ${formatAmount(summary.lowest.amount)} (${summary.lowest.title || 'N/A'})`,
        ];
        
        summaryItems.forEach(item => {
          pdf.text(item, marginX, yPosition);
          yPosition += 8;
          
          // Check if we need a new page
          if (yPosition > pdfHeight - 20) {
            addPageWithHeaderFooter();
            yPosition = 30;
          }
        });
        
        // Add some space after summary
        yPosition += 10;
      }
      
      // Add chart if requested
      if (options.includeChart) {
        // Check if we need a new page for the chart
        if (yPosition > pdfHeight - 100) {
          addPageWithHeaderFooter();
          yPosition = 30;
        }
        
        // Add chart title
        const chartTitle = reportType === 'monthly'
          ? `Expenses for ${getMonthName(month)} ${year}`
          : reportType === 'yearly'
          ? `Expenses for ${year}`
          : 'Expenses by Category';
          
        pdf.setFontSize(14);
        pdf.text(chartTitle, marginX, yPosition);
        yPosition += 10;
        
        // Get the chart canvas and add it to the PDF
        const chartElement = document.querySelector('.h-80 canvas');
        if (chartElement) {
          const chartImgData = chartElement.toDataURL('image/jpeg', 1.0);
          
          // Calculate the height of the chart in the PDF (maintaining aspect ratio)
          const chartRatio = chartElement.height / chartElement.width;
          const chartWidth = contentWidth;
          const chartHeight = chartWidth * chartRatio;
          
          // Check if chart will fit on current page, if not add a new page
          if (yPosition + chartHeight > pdfHeight - 20) {
            addPageWithHeaderFooter();
            yPosition = 30;
          }
          
          pdf.addImage(chartImgData, 'JPEG', marginX, yPosition, chartWidth, chartHeight);
          yPosition += chartHeight + 15;
        }
      }
      
      // Add detailed expense data if requested
      if (options.includeDetails) {
        if (yPosition > pdfHeight - 60) {
          addPageWithHeaderFooter();
          yPosition = 30;
        }
        
        // Add expense details in table format
        pdf.setFontSize(14);
        pdf.text('Detailed Expenses', marginX, yPosition);
        yPosition += 10;
        
        // Define table columns
        const columns = ['Date', 'Title', 'Category', 'Amount'];
        const colWidths = [30, 60, 40, 40]; // Sum should equal contentWidth
        const rowHeight = 8;
        
        // Add table headers
        pdf.setFillColor(220, 220, 220);
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'bold');
        
        let xOffset = marginX;
        columns.forEach((col, i) => {
          pdf.rect(xOffset, yPosition, colWidths[i], rowHeight, 'F');
          pdf.text(col, xOffset + 2, yPosition + 6);
          xOffset += colWidths[i];
        });
        yPosition += rowHeight;
        
        // Add rows
        pdf.setFont(undefined, 'normal');
        
        const filteredExpenses = getFilteredExpenses();
        
        // Apply additional date filtering if specified in export options
        let sortedExpenses = [...filteredExpenses];
        if (options.dateFrom) {
          const fromDate = new Date(options.dateFrom);
          sortedExpenses = sortedExpenses.filter(exp => 
            new Date(exp.date) >= fromDate
          );
        }
        
        if (options.dateTo) {
          const toDate = new Date(options.dateTo);
          toDate.setHours(23, 59, 59, 999); // End of day
          sortedExpenses = sortedExpenses.filter(exp => 
            new Date(exp.date) <= toDate
          );
        }
        
        // Limit number of items if specified
        if (options.maxItems !== 'all') {
          const maxItems = parseInt(options.maxItems);
          if (!isNaN(maxItems) && maxItems > 0) {
            sortedExpenses = sortedExpenses
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .slice(0, maxItems);
          }
        } else {
          // Sort by date if not limiting
          sortedExpenses = sortedExpenses.sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
        }
        
        // Display expenses (with pagination)
        sortedExpenses.forEach((expense, index) => {
          // Check if we need a new page
          if (yPosition > pdfHeight - 20) {
            addPageWithHeaderFooter();
            yPosition = 30;
            
            // Re-add table headers on new page
            pdf.setFillColor(220, 220, 220);
            pdf.setTextColor(0, 0, 0);
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'bold');
            
            xOffset = marginX;
            columns.forEach((col, i) => {
              pdf.rect(xOffset, yPosition, colWidths[i], rowHeight, 'F');
              pdf.text(col, xOffset + 2, yPosition + 6);
              xOffset += colWidths[i];
            });
            yPosition += rowHeight;
            pdf.setFont(undefined, 'normal');
          }
          
          // Alternate row colors for readability
          if (index % 2 === 0) {
            pdf.setFillColor(245, 245, 245);
            pdf.rect(marginX, yPosition, contentWidth, rowHeight, 'F');
          }
          
          const categoryObj = EXPENSE_CATEGORIES.find(cat => cat.id === expense.category);
          const categoryName = categoryObj ? categoryObj.name : 'Uncategorized';
          
          // Truncate long text
          const truncateText = (text, maxLength) => {
            if (!text) return '';
            return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
          };
          
          xOffset = marginX;
          
          // Date
          pdf.text(new Date(expense.date).toLocaleDateString(), xOffset + 2, yPosition + 6);
          xOffset += colWidths[0];
          
          // Title (truncated if needed)
          pdf.text(truncateText(expense.title, 25), xOffset + 2, yPosition + 6);
          xOffset += colWidths[1];
          
          // Category
          pdf.text(truncateText(categoryName, 15), xOffset + 2, yPosition + 6);
          xOffset += colWidths[2];
          
          // Amount (right-aligned)
          const amountText = formatAmount(expense.amount);
          const amountWidth = pdf.getTextWidth(amountText);
          pdf.text(amountText, xOffset + colWidths[3] - amountWidth - 2, yPosition + 6);
          
          yPosition += rowHeight;
        });
      }
      
      // If no sections were included, add a message
      if (!options.includeSummary && !options.includeChart && !options.includeDetails) {
        pdf.setFontSize(14);
        pdf.setTextColor(100, 100, 100);
        pdf.text('No content selected for export', pdfWidth / 2, pdfHeight / 2, { align: 'center' });
      }
      
      // Save the PDF
      pdf.save(`${filename}.pdf`);
      
      // Remove temporary class and loading indicator
      reportElement.classList.remove('pdf-export-mode');
      document.body.removeChild(loadingIndicator);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Failed to export to PDF. Please try again later.');
      // Ensure cleanup in case of error
      const reportElement = document.getElementById('expense-report-container');
      if (reportElement) {
        reportElement.classList.remove('pdf-export-mode');
      }
      const loadingIndicator = document.querySelector('div[style*="position: fixed"]');
      if (loadingIndicator) {
        document.body.removeChild(loadingIndicator);
      }
    }
  };
  
  const chartData = getChartData();
  const chartOptions = getChartOptions();
  const summary = getReportSummary();
  
  // Render export options dialog
  const renderExportOptionsDialog = () => {
    if (!showExportOptions) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full">
          <h2 className="text-xl font-bold mb-4">Export Options</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Content to Include</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="includeSummary"
                    checked={exportOptions.includeSummary}
                    onChange={handleOptionChange}
                    className="mr-2"
                  />
                  Summary
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="includeChart" 
                    checked={exportOptions.includeChart}
                    onChange={handleOptionChange}
                    className="mr-2"
                  />
                  Chart
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="includeDetails"
                    checked={exportOptions.includeDetails}
                    onChange={handleOptionChange}
                    className="mr-2"
                  />
                  Detailed Expenses
                </label>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Limit Results</h3>
              <select
                name="maxItems"
                value={exportOptions.maxItems}
                onChange={handleOptionChange}
                className="block w-full mt-1 border border-gray-300 rounded-md shadow-sm p-2"
              >
                <option value="all">All Expenses</option>
                <option value="10">Last 10 Expenses</option>
                <option value="25">Last 25 Expenses</option>
                <option value="50">Last 50 Expenses</option>
                <option value="100">Last 100 Expenses</option>
              </select>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Date Range (Optional)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">From</label>
                  <input
                    type="date"
                    name="dateFrom"
                    value={exportOptions.dateFrom}
                    onChange={handleOptionChange}
                    className="block w-full mt-1 border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">To</label>
                  <input
                    type="date"
                    name="dateTo"
                    value={exportOptions.dateTo}
                    onChange={handleOptionChange}
                    className="block w-full mt-1 border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowExportOptions(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={isExporting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={processExport}
              className={`px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white ${
                isExporting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
              }`}
              disabled={isExporting}
            >
              {isExporting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Export'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-6" id="expense-report-container">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Expense Reports</h2>
      </div>
      
      {/* Report Controls */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value="monthly">Monthly Report</option>
              <option value="yearly">Yearly Report</option>
              <option value="category">Category Report</option>
            </select>
          </div>
          
          {reportType !== 'category' && (
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              >
                {getYears().map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {reportType === 'monthly' && (
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Month
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>
                    {getMonthName(i)}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Category (Optional)
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value="">All Categories</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Report Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Expenses</h3>
          <p className="text-2xl font-bold text-gray-800">{formatAmount(summary.total)}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Average Expense</h3>
          <p className="text-2xl font-bold text-gray-800">{formatAmount(summary.average)}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Number of Expenses</h3>
          <p className="text-2xl font-bold text-gray-800">{summary.count}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Highest Expense</h3>
          <p className="text-2xl font-bold text-gray-800">{formatAmount(summary.highest.amount)}</p>
          <p className="text-xs text-gray-500">{summary.highest.title || 'N/A'}</p>
        </div>
      </div>
      
      {/* Chart */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">
          {reportType === 'monthly'
            ? `Expenses for ${getMonthName(month)} ${year}`
            : reportType === 'yearly'
            ? `Expenses for ${year}`
            : 'Expenses by Category'}
        </h3>
        
        <div className="h-80">
          {chartData.labels.length > 0 ? (
            reportType === 'category' ? (
              <Bar data={chartData} options={chartOptions} />
            ) : (
              <Line data={chartData} options={chartOptions} />
            )
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-500">No data available for the selected period</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Export Options */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
            isExporting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          onClick={() => !isExporting && handleExportClick(preferredExportFormat)}
          title={`Quick export as ${preferredExportFormat.toUpperCase()} (Ctrl+E)`}
          disabled={isExporting}
        >
          {isExporting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Exporting...
            </>
          ) : (
            'Quick Export'
          )}
        </button>
        <div className="relative inline-block text-left" ref={menuRef}>
          <button
            type="button"
            className={`inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 ${
              isExporting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            id="export-menu"
            aria-expanded="true"
            aria-haspopup="true"
            onClick={() => !isExporting && setShowExportMenu(!showExportMenu)}
            title={`Export Report (Ctrl+E) - Currently set to export as ${preferredExportFormat.toUpperCase()}`}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export Report'}
            <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {showExportMenu && (
            <div 
              className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10" 
              role="menu" 
              aria-orientation="vertical" 
              aria-labelledby="export-menu"
            >
              <div className="py-1" role="none">
                <button
                  className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  role="menuitem"
                  onClick={() => handleExportClick('csv')}
                >
                  Export as CSV
                  {preferredExportFormat === 'csv' && (
                    <span className="ml-2 text-blue-500">✓</span>
                  )}
                </button>
                <button
                  className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  role="menuitem"
                  onClick={() => handleExportClick('excel')}
                >
                  Export as Excel
                  {preferredExportFormat === 'excel' && (
                    <span className="ml-2 text-blue-500">✓</span>
                  )}
                </button>
                <button
                  className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  role="menuitem"
                  onClick={() => handleExportClick('pdf')}
                >
                  Export as PDF
                  {preferredExportFormat === 'pdf' && (
                    <span className="ml-2 text-blue-500">✓</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Export Options Dialog */}
      {renderExportOptionsDialog()}
    </div>
  );
};

export default Reports; 