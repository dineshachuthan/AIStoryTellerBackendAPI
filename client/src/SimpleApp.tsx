export default function SimpleApp() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Simple App Test
        </h1>
        <p className="text-gray-600">
          If you can see this, React is mounting properly.
        </p>
        <button 
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          onClick={() => alert('Button clicked!')}
        >
          Test Button
        </button>
      </div>
    </div>
  );
}