const DisclaimerModal = ({ onClose, text }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-sm">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm"></div>

      {/* Modal Card */}
      <div className="relative bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl shadow-2xl p-8 max-w-6xl w-full mx-4 sm:mx-6 md:mx-auto border border-gray-200 dark:border-gray-700 transform scale-100 transition-transform duration-300 ease-in-out">
        {/* Modal Header */}
        <h2 className="text-3xl font-bold text-center mb-6 text-red-600 dark:text-red-400">
          Important Disclaimer
        </h2>
        
        {/* Modal Body with Disclaimer Text */}
        <div className="text-lg leading-relaxed text-center mb-8">
          {text}
        </div>
        
        {/* Close Button */}
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-500 focus:ring-opacity-50"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

export default DisclaimerModal;