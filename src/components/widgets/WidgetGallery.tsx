import React, { useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { ChatWidget } from '../chat/ChatWidget'; // Import your widgets
import { CodeExecutionWidget } from '../code-execution/CodeExecutionWidget';
import { SearchWidget } from '../search/SearchWidget';
// ... import other widgets ...
import { WidgetItem } from '../item/WidgetItem';

const WidgetGallery: React.FC = () => {
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (galleryRef.current) {
      html2canvas(galleryRef.current).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        // Do something with imgData (e.g., display it, save it)
        console.log(imgData); 
      });
    }
  }, []);

  return (
    <div ref={galleryRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
      <WidgetItem item={{id: 'chat-1', type: 'ChatWidget'}} widgetData={{/*...*/}} />
      <WidgetItem item={{id: 'code-1', type: 'CodeExecutionWidget'}} widgetData={{language: 'python', code: 'print("Hello")'}} />
      <WidgetItem item={{id: 'search-1', type: 'SearchWidget'}} widgetData={{/*...*/}} />
      {/* ... Render other widgets with example data ... */}
    </div>
  );
};

export default WidgetGallery; 